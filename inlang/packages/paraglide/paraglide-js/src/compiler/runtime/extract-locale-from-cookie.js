import { cookieName } from "./cookie-name.js";

/**
 * Extracts a cookie from the document.
 *
 * Will return undefined if the docuement is not available or if the cookie is not set.
 * The `document` object is not available in server-side rendering, so this function should not be called in that context.
 *
 * @returns {string | undefined}
 */
export function extractLocaleFromCookie() {
	if (typeof document === "undefined" || !document.cookie) {
		return;
	}
	const match = document.cookie.match(new RegExp(`(^| )${cookieName}=([^;]+)`));
	return match?.[2];
}
