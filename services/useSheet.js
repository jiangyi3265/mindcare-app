import { watch, nextTick, onBeforeUnmount } from "vue";

// A sheet dismisses with Escape and restores the previous page scroll/focus state.
export function useSheet(isOpen, close) {
	// #ifdef H5
	let previousFocus = null;
	let previousOverflow = "";
	let locked = false;
	const handleKey = (event) => {
		if (event.key === "Escape" && isOpen.value) {
			event.preventDefault();
			close();
		}
		if (event.key === "Tab" && isOpen.value) {
			const sheet = document.querySelector(".modal-scrim .sheet");
			const controls = [
				...(sheet?.querySelectorAll(
					'input, textarea, button, uni-button, [tabindex="0"]',
				) || []),
			].filter(
				(el) =>
					!el.hasAttribute("disabled") && el.getClientRects().length,
			);
			const first = controls[0],
				last = controls[controls.length - 1];
			if (!first) {
				event.preventDefault();
				return;
			}
			if (
				event.shiftKey &&
				(document.activeElement === first ||
					document.activeElement === sheet)
			) {
				event.preventDefault();
				last.focus();
			} else if (
				!event.shiftKey &&
				(document.activeElement === last ||
					document.activeElement === sheet)
			) {
				event.preventDefault();
				first.focus();
			}
		}
	};
	function unlock() {
		if (!locked) return;
		document.body.style.overflow = previousOverflow;
		document.removeEventListener("keydown", handleKey);
		previousFocus?.focus?.({ preventScroll: true });
		locked = false;
	}
	watch(
		isOpen,
		async (open) => {
			if (!open) return unlock();
			if (locked) return;
			previousFocus = document.activeElement;
			previousOverflow = document.body.style.overflow;
			document.body.style.overflow = "hidden";
			locked = true;
			document.addEventListener("keydown", handleKey);
			await nextTick();
			if (!isOpen.value) return;
			const sheet = document.querySelector(".modal-scrim .sheet");
			if (sheet) {
				sheet.setAttribute("tabindex", "-1");
				sheet.focus({ preventScroll: true });
			}
		},
		{ flush: "post" },
	);
	onBeforeUnmount(unlock);
	// #endif
}
