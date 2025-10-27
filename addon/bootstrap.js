/*
 * Bootstrap file for Zotero LLM Assistant
 * Based on Zotero Make It Red example
 */

var chromeHandle;

function install(data, reason) {}

async function startup({ id, version, resourceURI, rootURI }, reason) {
  var aomStartup = Components.classes[
    "@mozilla.org/addons/addon-manager-startup;1"
  ].getService(Components.interfaces.amIAddonManagerStartup);
  var manifestURI = Services.io.newURI(rootURI + "manifest.json");
  chromeHandle = aomStartup.registerChrome(manifestURI, [
    ["content", "zotero-llm-assistant", rootURI + "content/"],
  ]);

  // Load main module with rootURI
  var ctx = { rootURI: rootURI };
  Services.scriptloader.loadSubScript(
    `${rootURI}content/main.js`,
    ctx
  );
}

async function shutdown({ id, version, resourceURI, rootURI }, reason) {
  if (reason === APP_SHUTDOWN) {
    return;
  }

  try {
    if (chromeHandle) {
      chromeHandle.destruct();
      chromeHandle = null;
    }
  } catch (e) {
    // Ignore errors during shutdown
  }
}

async function uninstall(data, reason) {}

