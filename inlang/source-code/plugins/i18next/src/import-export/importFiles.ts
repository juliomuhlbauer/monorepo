/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type {
	Bundle,
	BundleNested,
	Message,
	Pattern,
	VariableReference,
	Variant,
} from "@inlang/sdk2"
import { type plugin } from "../plugin.js"
import { flatten } from "flat"

export const importFiles: NonNullable<(typeof plugin)["importFiles"]> = async ({ files }) => {
	const result: BundleNested[] = []
	const bundles: Bundle[] = []
	const messages: Message[] = []
	const variants: Variant[] = []

	for (const file of files) {
		const result = parseFile({ locale: file.locale, content: file.content })
		bundles.push(...result.bundles)
		messages.push(...result.messages)
		variants.push(...result.variants)
	}

	// merge the bundle declarations
	const uniqueBundleIds = [...new Set(bundles.map((bundle) => bundle.id))]
	const uniqueBundles: Bundle[] = uniqueBundleIds.map((id) => {
		const _bundles = bundles.filter((bundle) => bundle.id === id)
		const declarations = removeDuplicates(_bundles.flatMap((bundle) => bundle.declarations))
		return { id, declarations }
	})

	// establishing nesting
	for (const bundle of uniqueBundles) {
		const bundleNested: BundleNested = { ...bundle, messages: [] }

		// @ts-expect-error - casting the type here
		bundleNested.messages = messages.filter((message) => message.bundleId === bundle.id)

		for (const message of bundleNested.messages) {
			message.variants = variants.filter((variant) => variant.messageId === message.id)
		}

		result.push(bundleNested)
	}

	return { bundles: result }
}

function parseFile(args: { locale: string; content: ArrayBuffer }): {
	bundles: Bundle[]
	messages: Message[]
	variants: Variant[]
} {
	const resource: Record<string, string | string[]> = flatten(
		JSON.parse(new TextDecoder().decode(args.content))
	)

	const bundles: Bundle[] = []
	const messages: Message[] = []
	const variants: Variant[] = []

	for (const key in resource) {
		const value = resource[key]!
		const { bundle, message, variant } = parseMessage({ key, value, locale: args.locale, resource })
		bundles.push(bundle)
		messages.push(message)
		variants.push(variant)
	}
	return { bundles, messages, variants }
}

function parseMessage(args: {
	key: string
	value: string | string[]
	locale: string
	resource: Record<string, any>
}): { bundle: Bundle; message: Message; variant: Variant } {
	const pattern = parsePattern(args.value)

	// i18next suffixes keys with context or plurals
	// "friend_female_one" -> "friend"
	const keyWithoutContextOrPlurals = args.key.split("_")[0]!

	const bundle: Bundle = {
		id: keyWithoutContextOrPlurals,
		declarations: pattern.variableReferences.map((variableReference) => ({
			type: "input-variable",
			name: variableReference.name,
		})),
	}

	const message: Message = {
		id: keyWithoutContextOrPlurals,
		bundleId: keyWithoutContextOrPlurals,
		selectors: [],
		locale: args.locale,
	}

	const variant: Variant = {
		id: keyWithoutContextOrPlurals,
		messageId: keyWithoutContextOrPlurals,
		matches: [],
		pattern: pattern.result,
	}

	// plurals, see https://www.i18next.com/misc/json-format#i18next-json-v4
	const hasPlurals =
		args.key.endsWith("_zero") ||
		args.key.endsWith("_one") ||
		args.key.endsWith("_two") ||
		args.key.endsWith("_few") ||
		args.key.endsWith("_many") ||
		args.key.endsWith("_other")
	// context is used see https://www.i18next.com/translation-function/context
	const hasContext = hasPlurals
		? args.key.split("_").length === 3
		: args.key.split("_").length === 2

	if (hasContext && hasPlurals === false) {
		// "friend_male" -> ["friend", "male"]
		const [, context] = args.key.split("_")
		bundle.declarations.push({
			type: "input-variable",
			name: "context",
		})
		variant.matches = [
			{
				type: "literal-match",
				// i18next always uses "context" as the key
				key: "context",
				value: context!,
			},
		]
	} else if (hasContext && hasPlurals) {
		// "friend_female_one": "A girlfriend" -> ["friend", "female", "one"]
		const [, context, plural] = args.key.split("_")
		bundle.declarations.push({
			type: "input-variable",
			name: "context",
		})
		bundle.declarations.push({
			type: "input-variable",
			name: "count",
		})
		bundle.declarations.push({
			type: "local-variable",
			name: "countPlural",
			value: {
				type: "expression",
				arg: {
					type: "variable-reference",
					name: "count",
				},
				annotation: {
					type: "function-reference",
					name: "plural",
					options: [],
				},
			},
		})
		variant.matches = [
			{
				type: "literal-match",
				key: "context",
				value: context!,
			},
			{
				type: "literal-match",
				// i18next only allows matching against a count variable.
				// suffixing plural here because the inlang sdk v2 purposefully
				// did not allow using a variable with a function like `plural`
				// without declaring a new variable
				key: "countPlural",
				value: plural!,
			},
		]
	} else if (hasPlurals) {
		variant.matches = [
			{
				// i18next only allows matching against a count variable
				// suffixing plural because the inlang sdk v2 purposefully
				// did not allow using a variable with a function like `plural`
				// without declaring a new variable to reduce complexity
				type: "literal-match",
				key: "countPlural",
				value: args.key.split("_").at(-1)!,
			},
		]
		bundle.declarations.push({
			type: "input-variable",
			name: "count",
		})
		bundle.declarations.push({
			type: "local-variable",
			name: "countPlural",
			value: {
				type: "expression",
				arg: {
					type: "variable-reference",
					name: "count",
				},
				annotation: {
					type: "function-reference",
					name: "plural",
					options: [],
				},
			},
		})
	}

	bundle.declarations = removeDuplicates(bundle.declarations)

	return { bundle, message, variant }
}

function parsePattern(value: string | string[]): {
	variableReferences: VariableReference[]
	result: Pattern
} {
	const result: Variant["pattern"] = []
	const variableReferences: VariableReference[] = []

	if (Array.isArray(value)) {
		// i18next allows arrays as values
		// https://www.i18next.com/translation-function/objects-and-arrays#arrays
		//
		// odd choice, hard to support in an e2e localization workflow. hence,
		// we're just going to convert arrays to strings, assuming that a tiny
		// minority of users are using arrays as values and having them as string is fine
		value = value.toString()
	}

	// splits a pattern like "Hello {{name}}!" into an array of parts
	// "hello {{name}}, how are you?" -> ["hello ", "{{name}}", ", how are you?"]
	const parts = value.split(/({{.*?}})/).filter((part) => part !== "")

	for (const part of parts) {
		// it's text
		if ((part.startsWith("{{") && part.endsWith("}}")) === false) {
			result.push({ type: "text", value: part })
		}
		// it's an expression
		else {
			// i18next allows for annotations like `{{name, uppercase}}`
			const subparts = part.slice(2, -2).split(",")

			const arg = subparts[0]?.trim()
			const annotation = subparts[1]?.trim()

			if (arg === undefined) {
				throw new Error("Expected an argument in the expression but received undefined.")
			}

			const variableReference: VariableReference = { type: "variable-reference", name: arg }

			variableReferences.push(variableReference)

			result.push({
				type: "expression",
				arg: variableReference,
				...(annotation && {
					annotation: {
						type: "function-reference",
						name: annotation,
						options: [],
					},
				}),
			})
		}
	}

	return { variableReferences, result }
}
const removeDuplicates = <T extends any[]>(arr: T) =>
	[...new Set(arr.map((item) => JSON.stringify(item)))].map((item) => JSON.parse(item))
