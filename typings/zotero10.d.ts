/**
 * Zotero 10 type augmentations.
 *
 * The `zotero-types` package has not yet been updated for the Zotero 10 APIs
 * (multi-selection getters, undo/redo support, etc.), so we declare them here.
 * @see https://www.zotero.org/support/dev/zotero_10_for_developers
 */

export {};

declare global {
  namespace Zotero {
    /**
     * Zotero 10: undo/redo support. Label a group of saves inside a transaction
     * with `stageAction()` so they land on the undo stack as a single step.
     */
    const UndoHistory: {
      stageAction(action: string, args?: Record<string, unknown>): void;
    };
  }

  namespace _ZoteroTypes {
    interface ZoteroPane {
      /**
       * Zotero 10: plural selection getters. The singular getters
       * (`getSelectedLibraryID()`, `getSelectedCollection()`, etc.) now throw
       * when more than one row is selected.
       */
      getSelectedLibraryIDs(): number[];
      getSelectedCollections(): Zotero.Collection[];
      getSelectedSavedSearches(): Zotero.Collection[];
      getCollectionTreeRows(): Zotero.CollectionTreeRow[];
    }

    interface CollectionTree {
      getSelectedLibraryIDs(): number[];
      getSelectedCollections(): Zotero.Collection[];
      getSelectedSearches(): Zotero.Collection[];
      getSelectedRows(): any[];
    }

    interface ItemTree {
      /**
       * Zotero 10: the items list `collectionTreeRow` was removed; use
       * `collectionTreeRows` and `viewMode` instead.
       */
      collectionTreeRows: Zotero.CollectionTreeRow[];
      viewMode: string;
    }
  }
}
