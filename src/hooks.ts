import { getLocaleID, getString, initLocale } from "./utils/locale";
import { registerPrefsScripts } from "./modules/preferenceScript";
import { createZToolkit } from "./utils/ztoolkit";
import {
  generateLiteratureReview,
  generateSummariesOnly,
} from "./modules/reviewGenerator";

async function onStartup() {
  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);

  initLocale();

  registerPrefs();

  await Promise.all(
    Zotero.getMainWindows().map((win) => onMainWindowLoad(win)),
  );

  // Register the items context menu once via the official MenuManager API.
  registerRightClickMenu();

  addon.data.initialized = true;
}

function registerPrefs() {
  Zotero.PreferencePanes.register({
    pluginID: addon.data.config.addonID,
    src: rootURI + "content/preferences.xhtml",
    label: getString("prefs-title"),
    image: `chrome://${addon.data.config.addonRef}/content/icons/favicon.png`,
  });
}

async function onMainWindowLoad(win: _ZoteroTypes.MainWindow): Promise<void> {
  addon.data.ztoolkit = createZToolkit();

  win.MozXULElement.insertFTLIfNeeded(
    `${addon.data.config.addonRef}-mainWindow.ftl`,
  );

  const popupWin = new ztoolkit.ProgressWindow(addon.data.config.addonName, {
    closeOnClick: true,
    closeTime: -1,
  })
    .createLine({
      text: getString("startup-begin"),
      type: "default",
      progress: 0,
    })
    .show();

  await Zotero.Promise.delay(500);

  popupWin.changeLine({
    progress: 50,
    text: `[50%] ${getString("startup-begin")}`,
  });

  // Register stylesheet
  registerStyleSheet(win);

  await Zotero.Promise.delay(500);

  popupWin.changeLine({
    progress: 100,
    text: `[100%] ${getString("startup-finish")}`,
  });
  popupWin.startCloseTimer(3000);
}

function registerStyleSheet(win: _ZoteroTypes.MainWindow) {
  const doc = win.document;
  const styles = ztoolkit.UI.createElement(doc, "link", {
    properties: {
      type: "text/css",
      rel: "stylesheet",
      href: `chrome://${addon.data.config.addonRef}/content/zoteroPane.css`,
    },
  });
  doc.documentElement?.appendChild(styles);
}

/**
 * Register right-click context menu items for literature review.
 *
 * Uses the official `Zotero.MenuManager` API (introduced in Zotero 8), which
 * automatically removes the menu DOM elements when the plugin shuts down.
 */
function registerRightClickMenu() {
  if (typeof Zotero.MenuManager?.registerMenu !== "function") {
    return false;
  }

  const menuIcon = `chrome://${addon.data.config.addonRef}/content/icons/favicon@0.5x.png`;

  const hasRegularItems = (items?: Zotero.Item[]) =>
    (items || []).some((item) => item.isRegularItem());

  return Zotero.MenuManager.registerMenu({
    menuID: "litreview-item-menu",
    pluginID: addon.data.config.addonID,
    target: "main/library/item",
    menus: [
      {
        // Main menu item: Generate Literature Review
        menuType: "menuitem",
        l10nID: getLocaleID("menuitem-generate-review"),
        icon: menuIcon,
        onShowing: (_ev, context) => {
          context.setVisible(hasRegularItems(context.items));
        },
        onCommand: () => {
          addon.hooks.onGenerateReview();
        },
      },
      {
        // Submenu with additional options
        menuType: "submenu",
        l10nID: getLocaleID("menuitem-litreview-menu"),
        icon: menuIcon,
        menus: [
          {
            menuType: "menuitem",
            l10nID: getLocaleID("menuitem-summarize-only"),
            onShowing: (_ev, context) => {
              context.setVisible(hasRegularItems(context.items));
            },
            onCommand: () => {
              addon.hooks.onSummarizeOnly();
            },
          },
        ],
      },
    ],
  });
}

async function onMainWindowUnload(_win: Window): Promise<void> {
  ztoolkit.unregisterAll();
}

function onShutdown(): void {
  ztoolkit.unregisterAll();
  Zotero.MenuManager?.unregisterMenu("litreview-item-menu");
  addon.data.alive = false;
  // @ts-expect-error - Plugin instance is not typed
  delete Zotero[addon.data.config.addonInstance];
}

async function onPrefsEvent(type: string, data: { [key: string]: any }) {
  switch (type) {
    case "load":
      registerPrefsScripts(data.window);
      break;
    default:
      return;
  }
}

/**
 * Generate full literature review (summarize + combine).
 */
async function onGenerateReview() {
  try {
    await generateLiteratureReview();
  } catch (e: any) {
    ztoolkit.log("Error in onGenerateReview:", e);
    new ztoolkit.ProgressWindow(addon.data.config.addonName, {
      closeOnClick: true,
      closeTime: 5000,
    })
      .createLine({
        text: `Error: ${e.message}`,
        type: "fail",
      })
      .show();
  }
}

/**
 * Summarize selected items only (no combined review).
 */
async function onSummarizeOnly() {
  try {
    await generateSummariesOnly();
  } catch (e: any) {
    ztoolkit.log("Error in onSummarizeOnly:", e);
    new ztoolkit.ProgressWindow(addon.data.config.addonName, {
      closeOnClick: true,
      closeTime: 5000,
    })
      .createLine({
        text: `Error: ${e.message}`,
        type: "fail",
      })
      .show();
  }
}

export default {
  onStartup,
  onShutdown,
  onMainWindowLoad,
  onMainWindowUnload,
  onPrefsEvent,
  onGenerateReview,
  onSummarizeOnly,
};
