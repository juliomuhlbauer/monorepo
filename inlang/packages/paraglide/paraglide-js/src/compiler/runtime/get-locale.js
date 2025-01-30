import { assertIsLocale } from "./assert-is-locale.js";
import { baseLocale } from "./base-locale.js";
import { extractLocaleFromCookie } from "./extract-locale-from-cookie.js";
import { extractLocaleFromPathname } from "./extract-locale-from-pathname.js";
import { strategy } from "./strategy.js";

/**
 * This is a fallback to get started with a custom
 * strategy and avoid type errors.
 *
 * The implementation is overwritten
 * by \`defineGetLocale()\` and \`defineSetLocale()\`.
 *
 * @type {Locale|undefined}
 */
let _locale;

/**
 * Get the current locale.
 *
 * @example
 *   if (getLocale() === 'de') {
 *     console.log('Germany 🇩🇪');
 *   } else if (getLocale() === 'nl') {
 *     console.log('Netherlands 🇳🇱');
 *   }
 *
 * @type {() => Locale}
 */
export let getLocale = () => {
	/** @type {string | undefined} */
	let locale;

	for (const strat of strategy) {
		if (strat === "cookie") {
			locale = extractLocaleFromCookie();
		}
		if (strat === "baseLocale") {
			locale = baseLocale;
		}
		if (
			strat === "pathname" &&
			typeof window !== "undefined" &&
			window.location?.pathname
		) {
			locale = extractLocaleFromPathname(window.location.pathname);
		}
		if (strat === "variable" && _locale !== undefined) {
			locale = _locale;
		}
		// check if match, else continue loop
		if (locale !== undefined) {
			return assertIsLocale(locale);
		}
	}

	throw new Error("No locale found. There is an error in your strategy.");
};
