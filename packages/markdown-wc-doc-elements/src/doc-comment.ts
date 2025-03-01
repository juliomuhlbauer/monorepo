import { LitElement, css, html } from "lit"
import './doc-icon.js'

export default class Element extends LitElement {
	static override styles = css`
		:host {
			display: inline-flex;
			height: auto;
		}

		.comment-wrapper {
			background-color: #e3e8ed;
			border-radius: 0.5rem;
			padding: 1rem 1rem;
			margin: 0;
			font-weight: 500;
			line-height: 1.4em;
			font-size: 14px;
			color: #475569;
			position: relative;
			max-width: 300px;
		}

		/* A little rectangle make it look like a speech bubble */
		.comment-wrapper::after {
			content: "";
			position: absolute;
			top: 0;
			left: 0;
			z-index: 1;
			width: 0;
			height: 0;
			border: 0.8rem solid transparent;
			border-top-color: #e3e8ed;
			border-bottom: 0;
			margin-left: 0.8rem;
			margin-top: -0.7rem;
			transform: rotate(180deg);
			background-color: transparent;
		}

		.name {
			font-weight: 400;
			font-size: 0.9rem;
			margin-bottom: 1rem;
			display: flex;
			align-items: center;
			color: #64748b;
			gap: 0.5rem;
		}
	`

	static override properties = {
		text: { type: String },
		author: { type: String },
		icon: { type: String },
	}

	text: string = ""
	author: string = ""
	icon: string = ""

	override render() {
		return html`<div>
			<p class="name">
				${this.author}${this.icon ? html`<doc-icon icon=${this.icon}></doc-icon>` : ``}
			</p>
			<div class="comment-wrapper">${this.text}</div>
		</div>`
	}
}

if (typeof customElements !== "undefined" && !customElements.get("doc-comment")) {
	customElements.define("doc-comment", Element)
}
