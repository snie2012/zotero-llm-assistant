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

  // Load modules with rootURI
  var ctx = { rootURI: rootURI };
  
  // Load marked library first (needed for markdown rendering)
  try {
    Services.scriptloader.loadSubScript(
      rootURI + "content/lib/marked.min.js",
      ctx
    );
    // Configure marked options if available
    if (typeof marked !== 'undefined') {
      marked.setOptions({
        breaks: true,
        gfm: true,
        headerIds: true,
        mangle: false
      });
      Zotero.log("Marked library loaded successfully in bootstrap");
    }
  } catch (e) {
    Zotero.log("Warning: Could not load marked library in bootstrap: " + e);
  }

  // Load MathJax library (needed for LaTeX rendering)
  try {
    // Configure MathJax before loading (in global scope)
    MathJax = {
      tex: {
        inlineMath: [['$', '$'], ['\\(', '\\)']],
        displayMath: [['$$', '$$'], ['\\[', '\\]']],
        processEscapes: true,
        processEnvironments: true
      },
      options: {
        skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre'],
        ignoreHtmlClass: 'tex2jax_ignore',
        processHtmlClass: 'tex2jax_process|llm-markdown-content'
      },
      startup: {
        pageReady: () => {
          return MathJax.startup.defaultPageReady();
        }
      },
      svg: {
        fontCache: 'global'
      }
    };
    Services.scriptloader.loadSubScript(
      rootURI + "content/lib/mathjax.min.js",
      ctx
    );
    if (typeof MathJax !== 'undefined') {
      Zotero.log("MathJax library loaded successfully in bootstrap");
    }
  } catch (e) {
    Zotero.log("Warning: Could not load MathJax library in bootstrap: " + e);
  }
  
  // Load PDF module
  Services.scriptloader.loadSubScript(
    rootURI + "content/pdf.js",
    ctx
  );
  // Load OpenAI module
  Services.scriptloader.loadSubScript(
    rootURI + "content/openai.js",
    ctx
  );
  // Load Claude module
  Services.scriptloader.loadSubScript(
    rootURI + "content/claude.js",
    ctx
  );
  // Load main module last
  Services.scriptloader.loadSubScript(
    rootURI + "content/main.js",
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

