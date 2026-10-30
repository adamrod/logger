import { readWhen, showWhen } from './when-field.js';

export function createEntryEditor(log, { logButton, editActions, deleteActions, whenField, whenInput }, screen) {
  let editingId = null;
  let confirmingDelete = false;

  function stopEditing() {
    const id = editingId;
    editingId = null;
    confirmingDelete = false;
    return id;
  }

  const actions = {
    edit: ({ id }) => {
      editingId = id;
      confirmingDelete = false;
      screen.fill(log.getEntries().find((entry) => entry.timestamp === id));
      showWhen(whenInput, id);
      screen.render();
    },
    save: () => {
      const changes = screen.read();
      if (!changes) return;
      const id = stopEditing();
      log.update(id, { ...changes, timestamp: readWhen(whenInput, id) });
    },
    'cancel-edit': () => { stopEditing(); screen.render(); },
    delete: () => { confirmingDelete = true; screen.render(); },
    'cancel-delete': () => { confirmingDelete = false; screen.render(); },
    'confirm-delete': () => {
      const id = stopEditing();
      log.remove(id);
    },
  };

  function render() {
    logButton.hidden = editingId !== null;
    editActions.hidden = editingId === null || confirmingDelete;
    deleteActions.hidden = !confirmingDelete;
    whenField.hidden = editingId === null;
  }

  return { actions, render, stopEditing, editingId: () => editingId };
}
