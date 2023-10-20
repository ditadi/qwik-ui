import {
  $,
  QRL,
  QwikIntrinsicElements,
  QwikMouseEvent,
  Signal,
  Slot,
  component$,
  useSignal,
  useStyles$,
  useTask$,
} from '@builder.io/qwik';
import {
  WidthElement as WidthState,
  activateFocusTrap,
  adjustScrollbar,
  closing,
  deactivateFocusTrap,
  keepModalInPlaceWhileScrollbarReappears,
  lockScroll,
  overrideNativeDialogEscapeBehaviorWith,
  showModal,
  trapFocus,
  unlockScroll,
  wasModalBackdropClicked,
} from './modal-behavior';

import styles from './modal.css?inline';

export type ModalProps = Omit<QwikIntrinsicElements['dialog'], 'open'> & {
  onShow$?: QRL<() => void>;
  onClose$?: QRL<() => void>;
  'bind:show'?: Signal<boolean>;
  closeOnBackdropClick?: boolean;
  alert?: boolean;
};

export const Modal = component$((props: ModalProps) => {
  useStyles$(styles);
  const modalRefSig = useSignal<HTMLDialogElement>();
  const scrollbar: WidthState = { width: null };

  const { 'bind:show': givenOpenSig } = props;

  const defaultShowSig = useSignal(false);
  const showSig = givenOpenSig || defaultShowSig;

  useTask$(async function toggleModal({ track, cleanup }) {
    const isOpen = track(() => showSig.value);
    const modal = modalRefSig.value;

    if (!modal) return;

    const focusTrap = trapFocus(modal);

    const escapeKeydownHandler = overrideNativeDialogEscapeBehaviorWith(
      () => (showSig.value = false),
    );

    window.addEventListener('keydown', escapeKeydownHandler);

    if (isOpen) {
      showModal(modal, props.onShow$);
      adjustScrollbar(scrollbar, modal);
      activateFocusTrap(focusTrap);
      lockScroll();
    } else {
      unlockScroll(scrollbar);
      closing(modal, props.onClose$);
    }

    cleanup(() => {
      deactivateFocusTrap(focusTrap);
      keepModalInPlaceWhileScrollbarReappears(scrollbar, modalRefSig.value);
      window.removeEventListener('keydown', escapeKeydownHandler);
    });
  });

  const closeOnBackdropClick$ = $((event: QwikMouseEvent) => {
    if (props.alert === true || props.closeOnBackdropClick === false) {
      return;
    }

    if (wasModalBackdropClicked(modalRefSig.value, event)) {
      showSig.value = false;
    }
  });

  return (
    <dialog
      role={props.alert === true ? 'alertdialog' : 'dialog'}
      {...props}
      ref={modalRefSig}
      onClick$={(event) => closeOnBackdropClick$(event)}
    >
      <Slot />
    </dialog>
  );
});
