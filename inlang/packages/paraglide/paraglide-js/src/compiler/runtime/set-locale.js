import {
	cookieName,
	strategy,
	TREE_SHAKE_COOKIE_STRATEGY_USED,
	TREE_SHAKE_GLOBAL_VARIABLE_STRATEGY_USED,
	TREE_SHAKE_URL_PATTERN_STRATEGY_USED,
} from "./variables.js";
import { localizeUrl } from "./localize-url.js";

/**
 * Set the locale.
 *
 * @example
 *   setLocale('en');
 *
 * @type {(newLocale: Locale) => void}
 */
export let setLocale = (newLocale) => {
	let localeHasBeenSet = false;
	for (const strat of strategy) {
		if (
			TREE_SHAKE_GLOBAL_VARIABLE_STRATEGY_USED &&
			strat === "globalVariable"
		) {
			// a default for a custom strategy to get started quickly
			// is likely overwritten by `defineSetLocale()`
			_locale = newLocale;
			localeHasBeenSet = true;
		} else if (TREE_SHAKE_COOKIE_STRATEGY_USED && strat === "cookie") {
			if (typeof document === "undefined" || !document.cookie) {
				continue;
			}
			// set the cookie
			document.cookie = `${cookieName}=${newLocale}`;
			localeHasBeenSet = true;
		} else if (strat === "baseLocale") {
			// nothing to be set here. baseLocale is only a fallback
			continue;
		} else if (TREE_SHAKE_URL_PATTERN_STRATEGY_USED && strat === "urlPattern") {
			// route to the new url
			//
			// this triggers a page reload but a user rarely
			// switches locales, so this should be fine.
			//
			// if the behavior is not desired, the implementation
			// can be overwritten by `defineSetLocale()` to avoid
			// a full page reload.
			window.location.href = localizeUrl(window.location.href, {
				locale: newLocale,
			}).href;
			// just in case return. the browser reloads the page by setting href
			return;
		} else {
			throw new Error("Unknown strategy");
		}
	}
	if (localeHasBeenSet === false) {
		throw new Error(
			"No strategy was able to set the locale. This can happen if you use browser-based strategies like `cookie` in a server-side rendering environment. Overwrite setLocale() on the server to avoid this error."
		);
	} else if (typeof window !== "undefined" && window.location) {
		// reload the page to reflect the new locale
		window.location.reload();
	}

	return;
};
