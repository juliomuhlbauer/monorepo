import { compileBundle } from "./compile-bundle.js";
import { selectBundleNested, type InlangProject } from "@inlang/sdk";
import { lookup } from "../services/lookup.js";
import { generateLocaleModules } from "./output-structure/locale-modules.js";
import { generateMessageModules } from "./output-structure/message-modules.js";
import {
	defaultCompilerOptions,
	type CompilerOptions,
} from "./compiler-options.js";

/**
 * Takes an inlang project and compiles it into a set of files.
 *
 * Use this function for more programmatic control than `compile()`.
 * You can adjust the output structure and get the compiled files as a return value.
 *
 * @example
 *   const output = await compileProject({ project });
 *   await writeOutput('path', output, fs.promises);
 */
export const compileProject = async (args: {
	project: InlangProject;
	compilerOptions?: Omit<CompilerOptions, "fs" | "project" | "outdir">;
}): Promise<Record<string, string>> => {
	const optionsWithDefaults = {
		...defaultCompilerOptions,
		...args.compilerOptions,
	};

	const settings = await args.project.settings.get();
	const bundles = await selectBundleNested(args.project.db).execute();

	//Maps each language to it's fallback
	//If there is no fallback, it will be undefined
	const fallbackMap = getFallbackMap(settings.locales, settings.baseLocale);
	const compiledBundles = bundles.map((bundle) =>
		compileBundle({
			bundle,
			fallbackMap,
		})
	);

	const output: Record<string, string> = {};

	if (optionsWithDefaults.outputStructure === "locale-modules") {
		const regularOutput = generateLocaleModules(
			compiledBundles,
			settings,
			fallbackMap,
			optionsWithDefaults
		);
		Object.assign(output, regularOutput);
	}

	if (optionsWithDefaults.outputStructure === "message-modules") {
		const messageModuleOutput = generateMessageModules(
			compiledBundles,
			settings,
			fallbackMap,
			optionsWithDefaults
		);
		Object.assign(output, messageModuleOutput);
	}

	if (optionsWithDefaults.emitGitIgnore) {
		output[".gitignore"] = ignoreDirectory;
	}

	if (optionsWithDefaults.emitPrettierIgnore) {
		output[".prettierignore"] = ignoreDirectory;
	}

	for (const [filename, content] of Object.entries(
		optionsWithDefaults.additionalFiles ?? {}
	)) {
		output[filename] = content;
	}

	for (const [filename, content] of Object.entries(output)) {
		if (optionsWithDefaults.includeEslintDisableComment) {
			if (filename.endsWith(".js")) {
				output[filename] = `// eslint-disable\n${content}`;
			}
		}
	}

	return output;
};

export function getFallbackMap<T extends string>(
	locales: T[],
	baseLocale: NoInfer<T>
): Record<T, T | undefined> {
	return Object.fromEntries(
		locales.map((lang) => {
			const fallbackLanguage = lookup(lang, {
				locales: locales.filter((l) => l !== lang),
				baseLocale,
			});

			if (lang === fallbackLanguage) return [lang, undefined];
			else return [lang, fallbackLanguage];
		})
	) as Record<T, T | undefined>;
}

const ignoreDirectory = `# ignore everything because the directory is auto-generated by inlang paraglide-js
# for more info visit https://inlang.com/m/gerre34r/paraglide-js
*
`;
