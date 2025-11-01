import { CookieHandlerDevtools } from '../devtools/cookieHandlerDevtools.js';
import { AdHandler } from '../lib/ads/adHandler.js';
import { Animate } from '../lib/animate.js';
import { BrowserDetector } from '../lib/browserDetector.js';
import { Cookie } from '../lib/cookie.js';
import { GenericStorageHandler } from '../lib/genericStorageHandler.js';
import { HeaderstringFormat } from '../lib/headerstringFormat.js';
import { JsonFormat } from '../lib/jsonFormat.js';
import { NetscapeFormat } from '../lib/netscapeFormat.js';
import { ExportFormats } from '../lib/options/exportFormats.js';
import { OptionsHandler } from '../lib/optionsHandler.js';
import { PermissionHandler } from '../lib/permissionHandler.js';
import { ThemeHandler } from '../lib/themeHandler.js';
import { CookieHandlerPopup } from './cookieHandlerPopup.js';

(function () {
  ('use strict');

  let containerCookie;
  let cookiesListHtml;
  let pageTitleContainer;
  let notificationElement;
  let loadedCookies = {};
  let disableButtons = false;

  const notificationQueue = [];
  let notificationTimeout;

  const browserDetector = new BrowserDetector();
  const permissionHandler = new PermissionHandler(browserDetector);
  const storageHandler = new GenericStorageHandler(browserDetector);
  const optionHandler = new OptionsHandler(browserDetector, storageHandler);
  const themeHandler = new ThemeHandler(optionHandler);
  const adHandler = new AdHandler(
    browserDetector,
    storageHandler,
    optionHandler
  );
  const cookieHandler = window.isDevtools
    ? new CookieHandlerDevtools(browserDetector)
    : new CookieHandlerPopup(browserDetector);

  document.addEventListener('DOMContentLoaded', async function () {
    // Initialize i18n
    await window.i18n.init();
    updateLanguage();
    
    containerCookie = document.getElementById('cookie-container');
    notificationElement = document.getElementById('notification');
    pageTitleContainer = document.getElementById('pageTitle');

    await initWindow();

    /**
     * Expands the HTML cookie element.
     * @param {element} e Element to expand.
     */
    function expandCookie(e) {
      const parent = e.target.closest('li');
      const header = parent.querySelector('.header');
      const expando = parent.querySelector('.expando');

      Animate.toggleSlide(expando);
      header.classList.toggle('active');
      header.ariaExpanded = header.classList.contains('active');
      expando.ariaHidden = !header.classList.contains('active');
    }

    /**
     * Handles clicks on the delete button of a cookie.
     * @param {Element} e Delete button element.
     * @return {false} returns false to prevent click event propagation.
     */
    function deleteButton(e) {
      e.preventDefault();
      console.log('removing cookie...');
      const listElement = e.target.closest('li');
      removeCookie(listElement.dataset.name);
      return false;
    }

    /**
     * Handles saving a cookie from a form.
     * @param {element} form Form element that contains the cookie fields.
     * @return {false} returns false to prevent click event propagation.
     */
    function saveCookieForm(form) {
      const isCreateForm = form.classList.contains('create');

      const id = form.dataset.id;
      const name = form.querySelector('input[name="name"]').value;
      const value = form.querySelector('textarea[name="value"]').value;

      let domain;
      let path;
      let expiration;
      let sameSite;
      let hostOnly;
      let session;
      let secure;
      let httpOnly;

      if (!isCreateForm) {
        domain = form.querySelector('input[name="domain"]').value;
        path = form.querySelector('input[name="path"]').value;
        expiration = form.querySelector('input[name="expiration"]').value;
        sameSite = form.querySelector('select[name="sameSite"]').value;
        hostOnly = form.querySelector('input[name="hostOnly"]').checked;
        session = form.querySelector('input[name="session"]').checked;
        secure = form.querySelector('input[name="secure"]').checked;
        httpOnly = form.querySelector('input[name="httpOnly"]').checked;
      }
      saveCookie(
        id,
        name,
        value,
        domain,
        path,
        expiration,
        sameSite,
        hostOnly,
        session,
        secure,
        httpOnly
      );

      if (form.classList.contains('create')) {
        showCookiesForTab();
      }

      return false;
    }

    /**
     * Creates or saves changes to a cookie.
     * @param {string} id HTML ID assigned to the cookie.
     * @param {string} name Name of the cookie.
     * @param {string} value Value of the cookie.
     * @param {string} domain
     * @param {string} path
     * @param {string} expiration
     * @param {string} sameSite
     * @param {boolean} hostOnly
     * @param {boolean} session
     * @param {boolean} secure
     * @param {boolean} httpOnly
     */
    function saveCookie(
      id,
      name,
      value,
      domain,
      path,
      expiration,
      sameSite,
      hostOnly,
      session,
      secure,
      httpOnly
    ) {
      console.log('saving cookie...');

      const cookieContainer = loadedCookies[id];
      let cookie = cookieContainer ? cookieContainer.cookie : null;
      let oldName;
      let oldHostOnly;

      if (cookie) {
        oldName = cookie.name;
        oldHostOnly = cookie.hostOnly;
      } else {
        cookie = {};
        oldName = name;
        oldHostOnly = hostOnly;
      }

      cookie.name = name;
      cookie.value = value;

      if (domain !== undefined) {
        cookie.domain = domain;
      }
      if (path !== undefined) {
        cookie.path = path;
      }
      if (sameSite !== undefined) {
        cookie.sameSite = sameSite;
      }
      if (hostOnly !== undefined) {
        cookie.hostOnly = hostOnly;
      }
      if (session !== undefined) {
        cookie.session = session;
      }
      if (secure !== undefined) {
        cookie.secure = secure;
      }
      if (httpOnly !== undefined) {
        cookie.httpOnly = httpOnly;
      }

      if (cookie.session) {
        cookie.expirationDate = null;
      } else {
        cookie.expirationDate = new Date(expiration).getTime() / 1000;
        if (!cookie.expirationDate) {
          // Reset it to null because on safari it is NaN and causes failures.
          cookie.expirationDate = null;
          cookie.session = true;
        }
      }

      if (oldName !== name || oldHostOnly !== hostOnly) {
        cookieHandler.removeCookie(oldName, getCurrentTabUrl(), function () {
          cookieHandler.saveCookie(
            cookie,
            getCurrentTabUrl(),
            function (error, cookie) {
              if (error) {
                sendNotification(error);
                return;
              }
              if (browserDetector.isSafari()) {
                onCookiesChanged();
              }
              if (cookieContainer) {
                cookieContainer.showSuccessAnimation();
              }
            }
          );
        });
      } else {
        // Should probably put in a function to prevent duplication
        cookieHandler.saveCookie(
          cookie,
          getCurrentTabUrl(),
          function (error, cookie) {
            if (error) {
              sendNotification(error);
              return;
            }
            if (browserDetector.isSafari()) {
              onCookiesChanged();
            }

            if (cookieContainer) {
              cookieContainer.showSuccessAnimation();
            }
          }
        );
      }
    }

    if (containerCookie) {
      containerCookie.addEventListener('click', e => {
        let target = e.target;
        if (target.nodeName === 'path') {
          target = target.parentNode;
        }
        if (target.nodeName === 'svg') {
          target = target.parentNode;
        }

        if (
          target.classList.contains('header') ||
          target.classList.contains('header-name') ||
          target.classList.contains('header-extra-info')
        ) {
          return expandCookie(e);
        }
        if (target.classList.contains('delete')) {
          return deleteButton(e);
        }
        if (target.classList.contains('save')) {
          return saveCookieForm(e.target.closest('li').querySelector('form'));
        }
      });
      document.addEventListener('keydown', e => {
        if (e.code === 'Space' || e.code === 'Enter') {
          const target = e.target;
          if (target.classList.contains('header')) {
            e.preventDefault();
            return expandCookie(e);
          }
        }
      });
    }

    containerCookie.addEventListener('submit', e => {
      e.preventDefault();
      saveCookieForm(e.target);
      return false;
    });

    // Removed button event listeners for buttons that no longer exist
    // (create-cookie, delete-all-cookies, import-cookies, export-cookies, save-create-cookie, save-import-cookie, etc.)

    const mainMenuContent = document.querySelector('#main-menu-content');
    document
      .querySelector('#main-menu-button')
      .addEventListener('click', function (e) {
        mainMenuContent.classList.toggle('visible');
      });

    document.addEventListener('click', function (e) {
      // Clicks in the main menu should not dismiss it.
      if (
        document.querySelector('#main-menu').contains(e.target) ||
        !mainMenuContent.classList.contains('visible')
      ) {
        return;
      }
      console.log('main menu blur');
      mainMenuContent.classList.remove('visible');
    });

    document.addEventListener('click', function (e) {
      const exportMenu = document.querySelector('#export-menu');
      // Clicks in the export menu should not dismiss it.
      if (!exportMenu || exportMenu.contains(e.target)) {
        return;
      }

      const exportButton = document.querySelector('#export-cookies');
      if (!exportButton || exportButton.contains(e.target)) {
        return;
      }

      console.log('export menu blur');
      hideExportMenu();
    });

    document
      .querySelector('#advanced-toggle-all')
      .addEventListener('change', async function (e) {
        const isAdvanced = e.target.checked;
        optionHandler.setCookieAdvanced(isAdvanced);
        // Sync with storage for settings page
        await storageHandler.setLocal('showAdvancedView', isAdvanced);
        showCookiesForTab();
      });

    document
    notificationElement.addEventListener('animationend', e => {
      if (notificationElement.classList.contains('fadeInUp')) {
        return;
      }

      triggerNotification();
    });

    document
      .getElementById('notification-dismiss')
      .addEventListener('click', e => {
        hideNotification();
      });

    // Settings button
    document
      .querySelector('#menu-settings')
      .addEventListener('click', function (e) {
        const settingsUrl = browserDetector.getApi().runtime.getURL('interface/settings/settings.html');
        browserDetector.getApi().tabs.create({ url: settingsUrl });
      });


    // Storage Tabs - Switch between Cookies, LocalStorage, SessionStorage
    document.querySelectorAll('.tab-button').forEach(button => {
      button.addEventListener('click', () => {
        const tab = button.dataset.tab;
        switchStorageTab(tab);
      });
    });

    // Save Session Modal Event Listeners
    document.getElementById('closeSaveSessionModal').addEventListener('click', hideSaveSessionModal);
    document.getElementById('cancelSaveSessionBtn').addEventListener('click', hideSaveSessionModal);
    document.getElementById('saveSessionForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const sessionName = document.getElementById('sessionNameInput').value.trim();
      if (sessionName) {
        hideSaveSessionModal();
        await saveCurrentSessionWithName(sessionName);
      }
    });

    adjustWidthIfSmaller();

    if (chrome && chrome.runtime && chrome.runtime.getBrowserInfo) {
      chrome.runtime.getBrowserInfo(function (info) {
        const mainVersion = info.version.split('.')[0];
        if (mainVersion < 57) {
          containerCookie.style.height = '600px';
        }
      });
    }
  });

  // == End document ready == //

  /**
   * Builds the HTML for the cookies of the current tab.
   * @return {Promise|null}
   */
  async function showCookiesForTab() {
    if (!cookieHandler.currentTab) {
      return;
    }
    if (disableButtons) {
      return;
    }

    console.log('showing cookies');
    
    // Clear any previous storage messages
    if (containerCookie) {
      containerCookie.innerHTML = '';
    }

    setPageTitle('Session Manager');
    // Removed button-bar references (buttons no longer exist)
    document.myThing = 'DarkSide';
    const domain = getDomainFromUrl(cookieHandler.currentTab.url);
    const subtitleLine = document.querySelector('.titles h2');
    if (subtitleLine) {
      subtitleLine.textContent = domain || cookieHandler.currentTab.url;
    }

    if (!permissionHandler.canHavePermissions(cookieHandler.currentTab.url)) {
      showPermissionImpossible();
      return;
    }
    // If devtools has not been fully init yet, we will wait for a signal.
    if (!cookieHandler.currentTab) {
      showNoCookies();
      return;
    }
    const hasPermissions = await permissionHandler.checkPermissions(
      cookieHandler.currentTab.url
    );
    if (!hasPermissions) {
      showNoPermission();
      return;
    }

    cookieHandler.getAllCookies(function (cookies) {
      cookies = cookies.sort(sortCookiesByName);

      loadedCookies = {};

      if (cookies.length === 0) {
        showNoCookies();
        return;
      }

      cookiesListHtml = document.createElement('ul');
      cookiesListHtml.appendChild(generateSearchBar());
      cookies.forEach(function (cookie) {
        const id = Cookie.hashCode(cookie);
        loadedCookies[id] = new Cookie(id, cookie, optionHandler);
        cookiesListHtml.appendChild(loadedCookies[id].html);
      });

      if (containerCookie.firstChild) {
        disableButtons = true;
        Animate.transitionPage(
          containerCookie,
          containerCookie.firstChild,
          cookiesListHtml,
          'right',
          () => {
            disableButtons = false;
          },
          optionHandler.getAnimationsEnabled()
        );
      } else {
        containerCookie.appendChild(cookiesListHtml);
      }
    });
  }

  /**
   * Displays a message to the user to let them know that no cookies are
   * available for the current page.
   */
  function showNoCookies() {
    if (disableButtons) {
      return;
    }
    // If on a different page (e.g: import page) - don't show the no-cookies message.
    const pageTitle =
      pageTitleContainer?.querySelector('h1')?.textContent ?? '';
    if (pageTitle !== 'Session Manager') {
      return;
    }
    cookiesListHtml = null;
    const html = document
      .importNode(document.getElementById('tmp-empty').content, true)
      .querySelector('p');
    if (containerCookie.firstChild) {
      if (containerCookie.firstChild.id === 'no-cookie') {
        return;
      }
      disableButtons = true;
      Animate.transitionPage(
        containerCookie,
        containerCookie.firstChild,
        html,
        'right',
        () => {
          disableButtons = false;
        },
        optionHandler.getAnimationsEnabled()
      );
    } else {
      containerCookie.appendChild(html);
    }
  }

  /**
   * Displays a message to the user to let them know that the extension doesn't
   * have permission to access the cookies for this page.
   */
  function showNoPermission() {
    if (disableButtons) {
      return;
    }
    cookiesListHtml = null;
    const html = document
      .importNode(document.getElementById('tmp-no-permission').content, true)
      .querySelector('div');

    // Firefox can't request permissions from devTools due to
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1796933
    if (
      browserDetector.isFirefox() &&
      typeof browserDetector.getApi().devtools !== 'undefined'
    ) {
      console.log('Firefox devtools permission display hack');
      html.querySelector('div').textContent =
        "Go to your settings (about:addons) or open the extension's popup to " +
        'adjust your permissions.';
    }

    if (containerCookie.firstChild) {
      if (containerCookie.firstChild.id === 'no-permission') {
        return;
      }
      disableButtons = true;
      Animate.transitionPage(
        containerCookie,
        containerCookie.firstChild,
        html,
        'right',
        () => {
          disableButtons = false;
        },
        optionHandler.getAnimationsEnabled()
      );
    } else {
      containerCookie.appendChild(html);
    }
    document.getElementById('request-permission').focus();
    document
      .getElementById('request-permission')
      .addEventListener('click', async event => {
        console.log('requesting permissions!');
        const isPermissionGranted = await permissionHandler.requestPermission(
          cookieHandler.currentTab.url
        );
        console.log('permission granted? ', isPermissionGranted);
        if (isPermissionGranted) {
          showCookiesForTab();
        }
      });
    document
      .getElementById('request-permission-all')
      .addEventListener('click', async event => {
        console.log('requesting all permissions!');
        const isPermissionGranted =
          await permissionHandler.requestPermission('<all_urls>');
        console.log('permission granted? ', isPermissionGranted);
        if (isPermissionGranted) {
          showCookiesForTab();
        }
      });
  }

  /**
   * Displays a message to the user to let them know that the extension can't
   * get permission to access the cookies for this page due to them being
   * internal pages.
   */
  function showPermissionImpossible() {
    if (disableButtons) {
      return;
    }
    cookiesListHtml = null;
    const html = document
      .importNode(
        document.getElementById('tmp-permission-impossible').content,
        true
      )
      .querySelector('div');

    if (containerCookie.firstChild) {
      if (containerCookie.firstChild.id === 'permission-impossible') {
        return;
      }
      disableButtons = true;
      Animate.transitionPage(
        containerCookie,
        containerCookie.firstChild,
        html,
        'right',
        () => {
          disableButtons = false;
        },
        optionHandler.getAnimationsEnabled()
      );
    } else {
      containerCookie.appendChild(html);
    }
  }

  /**
   * Shows the current version number in the interface.
   */
  function showVersion() {
    const versionElement = document.getElementById('version');
    if (versionElement) {
      const version = browserDetector.getApi().runtime.getManifest().version;
      versionElement.textContent = 'v' + version;
    }
  }

  /**
   * Enables or disables the animations based on the options.
   */
  function handleAnimationsEnabled() {
    if (optionHandler.getAnimationsEnabled()) {
      document.body.classList.remove('notransition');
    } else {
      document.body.classList.add('notransition');
    }
  }

  /**
   * Creates the HTML representation of a cookie.
   * @param {string} name Name of the cookie.
   * @param {string} value Value of the cookie.
   * @param {string} id HTML ID to use for the cookie.
   * @return {string} the HTML of the cookie.
   */
  function createHtmlForCookie(name, value, id) {
    const cookie = new Cookie(
      id,
      {
        name: name,
        value: value,
      },
      optionHandler
    );

    return cookie.html;
  }

  /**
   * Creates the HTML form to allow editing a cookie.
   * @return {string} The HTML for the form.
   */
  function createHtmlFormCookie() {
    const template = document.importNode(
      document.getElementById('tmp-create').content,
      true
    );
    return template.querySelector('form');
  }

  /**
   * Creates the HTML form to allow importing cookies.
   * @return {string} The HTML for the form.
   */
  function createHtmlFormImport() {
    const template = document.importNode(
      document.getElementById('tmp-import').content,
      true
    );
    return template.querySelector('form');
  }

  /**
   * Handles the logic of the export button, depending on user preferences.
   */
  function handleExportButtonClick() {
    const exportOption = optionHandler.getExportFormat();
    switch (exportOption) {
      case ExportFormats.Ask:
        toggleExportMenu();
        break;
      case ExportFormats.JSON:
        exportToJson();
        break;
      case ExportFormats.HeaderString:
        exportToHeaderstring();
        break;
      case ExportFormats.Netscape:
        exportToNetscape();
        break;
    }
  }

  /**
   * Toggles the visibility of the export menu.
   */
  function toggleExportMenu() {
    if (document.getElementById('export-menu')) {
      hideExportMenu();
    } else {
      showExportMenu();
    }
  }

  /**
   * Shows the export menu.
   */
  function showExportMenu() {
    const template = document.importNode(
      document.getElementById('tmp-export-options').content,
      true
    );
    containerCookie.appendChild(template.getElementById('export-menu'));

    document.getElementById('export-json').focus();
    document.getElementById('export-json').addEventListener('click', event => {
      exportToJson();
    });
    document
      .getElementById('export-headerstring')
      .addEventListener('click', event => {
        exportToHeaderstring();
      });
    document
      .getElementById('export-netscape')
      .addEventListener('click', event => {
        exportToNetscape();
      });
  }

  /**
   * Hides the export menu.
   */
  function hideExportMenu() {
    const exportMenu = document.getElementById('export-menu');
    if (exportMenu) {
      containerCookie.removeChild(exportMenu);
      document.activeElement.blur();
    }
  }

  if (typeof createHtmlFormCookie === 'undefined') {
    // This should not happen anyway ;)
    // eslint-disable-next-line no-func-assign
    createHtmlFormCookie = createHtmlForCookie;
  }

  /**
   * Exports all the cookies for the current tab in the JSON format.
   * Now includes localStorage and sessionStorage.
   */
  async function exportToJson() {
    hideExportMenu();
    const buttonIcon = document
      .getElementById('export-cookies')
      .querySelector('use');
    if (buttonIcon.getAttribute('href') === '../sprites/solid.svg#check') {
      return;
    }

    buttonIcon.setAttribute('href', '../sprites/solid.svg#check');

    // Get localStorage, sessionStorage, and IndexedDB
    let localStorageData = {};
    let sessionStorageData = {};
    let indexedDBData = {};
    
    try {
      const result = await browserDetector.getApi().scripting.executeScript({
        target: { tabId: cookieHandler.currentTab.id },
        func: async () => {
          // Get localStorage
          const local = {};
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            local[key] = localStorage.getItem(key);
          }
          
          // Get sessionStorage
          const session = {};
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            session[key] = sessionStorage.getItem(key);
          }
          
          // Helper function to filter out multimedia and convert to serializable format
          const makeSerializable = (obj, depth = 0) => {
            if (obj === null || obj === undefined) return obj;
            
            if (depth > 10) return '[Max depth reached]';
            
            // SKIP multimedia data
            if (obj instanceof ArrayBuffer) {
              return '[ArrayBuffer - skipped]';
            }
            
            if (ArrayBuffer.isView(obj)) {
              return '[Binary data - skipped]';
            }
            
            if (obj instanceof Blob) {
              return '[Blob - skipped]';
            }
            
            if (obj instanceof Date) {
              return { __type: 'Date', value: obj.toISOString() };
            }
            
            if (Array.isArray(obj)) {
              return obj.map(item => makeSerializable(item, depth + 1));
            }
            
            if (typeof obj === 'object') {
              const result = {};
              for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                  try {
                    const value = obj[key];
                    if (value instanceof ArrayBuffer || value instanceof Blob || ArrayBuffer.isView(value)) {
                      continue;
                    }
                    result[key] = makeSerializable(value, depth + 1);
                  } catch (e) {
                    // Skip problematic fields
                  }
                }
              }
              return result;
            }
            
            return obj;
          };
          
          // Get IndexedDB
          const indexedDB = {};
          try {
            const databases = await window.indexedDB.databases();
            
            for (const dbInfo of databases) {
              const dbName = dbInfo.name;
              
              await new Promise((resolve, reject) => {
                const request = window.indexedDB.open(dbName);
                
                request.onsuccess = async (event) => {
                  const db = event.target.result;
                  const storeNames = Array.from(db.objectStoreNames);
                  indexedDB[dbName] = {};
                  
                  for (const storeName of storeNames) {
                    try {
                      const transaction = db.transaction(storeName, 'readonly');
                      const store = transaction.objectStore(storeName);
                      const getAllRequest = store.getAll();
                      
                      await new Promise((resolveStore) => {
                        getAllRequest.onsuccess = () => {
                          const rawData = getAllRequest.result;
                          indexedDB[dbName][storeName] = makeSerializable(rawData);
                          resolveStore();
                        };
                        getAllRequest.onerror = () => resolveStore();
                      });
                    } catch (e) {
                      console.error('Error reading store:', storeName, e);
                    }
                  }
                  
                  db.close();
                  resolve();
                };
                
                request.onerror = () => reject(request.error);
              });
            }
          } catch (e) {
            console.error('Error reading IndexedDB:', e);
          }
          
          return {
            localStorage: local,
            sessionStorage: session,
            indexedDB: indexedDB
          };
        }
      });
      
      if (result && result[0] && result[0].result) {
        localStorageData = result[0].result.localStorage || {};
        sessionStorageData = result[0].result.sessionStorage || {};
        indexedDBData = result[0].result.indexedDB || {};
      }
    } catch (error) {
      console.error('Error getting storage for export:', error);
    }

    // Create complete export with cookies, localStorage, sessionStorage, and IndexedDB
    const completeExport = {
      cookies: JsonFormat.format(loadedCookies),
      localStorage: localStorageData,
      sessionStorage: sessionStorageData,
      indexedDB: indexedDBData,
      url: cookieHandler.currentTab.url,
      domain: getDomainFromUrl(cookieHandler.currentTab.url),
      exportDate: new Date().toISOString()
    };

    copyText(JSON.stringify(completeExport, null, 2));

    const cookieCount = Object.keys(loadedCookies).length;
    const localCount = Object.keys(localStorageData).length;
    const sessionCount = Object.keys(sessionStorageData).length;
    const indexedCount = Object.keys(indexedDBData).length;
    sendNotification(`Exported: ${cookieCount} cookies, ${localCount} localStorage, ${sessionCount} sessionStorage, ${indexedCount} IndexedDB`);
    
    setTimeout(() => {
      buttonIcon.setAttribute('href', '../sprites/solid.svg#file-export');
    }, 1500);
  }

  /**
   * Exports all the cookies for the current tab in the header string format.
   */
  function exportToHeaderstring() {
    hideExportMenu();
    const buttonIcon = document
      .getElementById('export-cookies')
      .querySelector('use');
    if (buttonIcon.getAttribute('href') === '../sprites/solid.svg#check') {
      return;
    }

    buttonIcon.setAttribute('href', '../sprites/solid.svg#check');
    copyText(HeaderstringFormat.format(loadedCookies));

    sendNotification('Cookies exported to clipboard as Header String');
    setTimeout(() => {
      buttonIcon.setAttribute('href', '../sprites/solid.svg#file-export');
    }, 1500);
  }

  /**
   * Exports all the cookies for the current tab in the Netscape format.
   */
  function exportToNetscape() {
    hideExportMenu();
    const buttonIcon = document
      .getElementById('export-cookies')
      .querySelector('use');
    if (buttonIcon.getAttribute('href') === '../sprites/solid.svg#check') {
      return;
    }

    buttonIcon.setAttribute('href', '../sprites/solid.svg#check');
    copyText(NetscapeFormat.format(loadedCookies));

    sendNotification('Cookies exported to clipboard as Netscape format');
    setTimeout(() => {
      buttonIcon.setAttribute('href', '../sprites/solid.svg#file-export');
    }, 1500);
  }

  /**
   * Removes a cookie from the current tab.
   * @param {string} name Name of the cookie to remove.
   * @param {string} url Url of the tab that contains the cookie.
   * @param {function} callback
   */
  function removeCookie(name, url, callback) {
    cookieHandler.removeCookie(name, url || getCurrentTabUrl(), function (e) {
      console.log('removed successfuly', e);
      if (callback) {
        callback();
      }
      if (browserDetector.isSafari()) {
        onCookiesChanged();
      }
    });
  }

  /**
   * Handles the CookiesChanged event and updates the interface.
   * @param {object} changeInfo
   */
  function onCookiesChanged(changeInfo) {
    if (!changeInfo) {
      showCookiesForTab();
      return;
    }

    console.log('Cookies have changed!', changeInfo.removed, changeInfo.cause);
    const id = Cookie.hashCode(changeInfo.cookie);

    if (changeInfo.cause === 'overwrite') {
      return;
    }

    if (changeInfo.removed) {
      if (loadedCookies[id]) {
        loadedCookies[id].removeHtml(() => {
          if (!Object.keys(loadedCookies).length) {
            showNoCookies();
          }
        });
        delete loadedCookies[id];
      }
      return;
    }

    if (loadedCookies[id]) {
      loadedCookies[id].updateHtml(changeInfo.cookie);
      return;
    }

    const newCookie = new Cookie(id, changeInfo.cookie, optionHandler);
    loadedCookies[id] = newCookie;

    if (!cookiesListHtml && document.getElementById('no-cookies')) {
      clearChildren(containerCookie);
      cookiesListHtml = document.createElement('ul');
      cookiesListHtml.appendChild(generateSearchBar());
      containerCookie.appendChild(cookiesListHtml);
    }

    if (cookiesListHtml) {
      cookiesListHtml.appendChild(newCookie.html);
    }
  }

  /**
   * Evaluates two cookies to determine which comes first when sorting them.
   * @param {object} a First cookie.
   * @param {object} b Second cookie.
   * @return {int} -1 if a should show first, 0 if they are equal, otherwise 1.
   */
  function sortCookiesByName(a, b) {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    return aName < bName ? -1 : aName > bName ? 1 : 0;
  }

  /**
   * Initialises the interface.
   * @param {object} _tab The current Tab.
   */
  async function initWindow(_tab) {
    await optionHandler.loadOptions();
    themeHandler.updateTheme();
    moveButtonBar();
    handleAd();
    handleAnimationsEnabled();
    
    // Check developer mode and hide/show tabs accordingly
    const settings = await storageHandler.getLocal('developerMode');
    const developerMode = settings || false;
    handleDeveloperMode(developerMode);
    
    optionHandler.on('optionsChanged', onOptionsChanged);
    cookieHandler.on('cookiesChanged', onCookiesChanged);
    cookieHandler.on('ready', () => {
      // Start on Sessions tab by default
      switchStorageTab('sessions');
    });
    
    // Load advanced view setting from storage
    storageHandler.getLocal('showAdvancedView').then(showAdvancedView => {
      const isAdvanced = showAdvancedView || false;
      optionHandler.setCookieAdvanced(isAdvanced);
      const advancedToggle = document.querySelector('#advanced-toggle-all');
      if (advancedToggle) {
        advancedToggle.checked = isAdvanced;
      }
    });
    
    if (cookieHandler.isReady) {
      // Start on Sessions tab by default
      switchStorageTab('sessions');
    }
    showVersion();
  }

  /**
   * Handles developer mode visibility for tabs.
   * @param {boolean} enabled Whether developer mode is enabled.
   */
  function handleDeveloperMode(enabled) {
    const pageTitle = document.getElementById('pageTitle');
    
    if (enabled) {
      // Show entire pageTitle section
      if (pageTitle) pageTitle.style.display = 'flex';
    } else {
      // Hide entire pageTitle section
      if (pageTitle) pageTitle.style.display = 'none';
    }
  }

  /**
   * Gets the URL of the current tab.
   * @return {string} The URL of the current tab, otherwise empty string if
   *     we can't get the current tab.
   */
  function getCurrentTabUrl() {
    if (cookieHandler.currentTab) {
      return cookieHandler.currentTab.url;
    }
    return '';
  }

  /**
   * Gets the domain of an URL.
   * @param {string} url URL to extract the domain from.
   * @return {string} The domain extracted.
   */
  function getDomainFromUrl(url) {
    const matches = url.match(/^https?:\/\/([^/?#]+)(?:[/?#]|$)/i);
    return matches && matches[1];
  }

  /**
   * Adds a notification to the notification queue.
   * @param {string} message Message to display in the notification.
   * @param {string} type Type of notification: 'success', 'error', 'info', 'warning'
   */
  function sendNotification(message, type = 'info') {
    notificationQueue.push({ message, type });
    triggerNotification();
  }

  /**
   * Generates the HTML for the search bar.
   * @return {string} The HTML to display the search bar.
   */
  function generateSearchBar() {
    const searchBarContainer = document.importNode(
      document.getElementById('tmp-search-bar').content,
      true
    );
    searchBarContainer
      .getElementById('searchField')
      .addEventListener('keyup', e => filterCookies(e.target, e.target.value));
    return searchBarContainer;
  }

  /**
   * Starts displaying the next notification in the queue if there is one.
   * This will also make sure that wer are not already in the middle of
   * displaying a notification already.
   */
  function triggerNotification() {
    if (!notificationQueue || !notificationQueue.length) {
      return;
    }
    if (notificationTimeout) {
      return;
    }
    if (notificationElement.classList.contains('fadeInUp')) {
      return;
    }

    showNotification();
  }

  /**
   * Creates the HTML for a notification and animates it into view for a
   * specific amount of time. Then it will dismiss itself if the user doesn't
   * dismiss it manually.
   */
  function showNotification() {
    if (notificationTimeout) {
      return;
    }

    const notification = notificationQueue.shift();
    const message = typeof notification === 'string' ? notification : notification.message;
    const type = typeof notification === 'string' ? 'info' : notification.type;

    notificationElement.parentElement.style.display = 'block';
    notificationElement.querySelector('#notification-dismiss').style.display = 'block';
    
    // Apply modern styling based on type - Dark mode optimized
    const colors = {
      success: { bg: '#0f0f0f', border: '#22c55e', text: '#4ade80', icon: '✓' },
      error: { bg: '#0f0f0f', border: '#ef4444', text: '#f87171', icon: '✕' },
      warning: { bg: '#0f0f0f', border: '#f59e0b', text: '#fbbf24', icon: '⚠' },
      info: { bg: '#0f0f0f', border: '#3b82f6', text: '#60a5fa', icon: 'ℹ' }
    };
    
    const color = colors[type] || colors.info;
    
    notificationElement.style.cssText = `
      background: ${color.bg};
      border: 1px solid ${color.border};
      color: ${color.text};
      padding: 14px 18px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 10px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
    `;
    
    const spanElement = notificationElement.querySelector('span');
    spanElement.innerHTML = `<span style="font-size: 18px; font-weight: 600;">${color.icon}</span> ${message}`;
    spanElement.setAttribute('role', 'alert');
    spanElement.style.cssText = 'flex: 1; display: flex; align-items: center; gap: 8px;';
    
    notificationElement.classList.add('fadeInUp');
    notificationElement.classList.remove('fadeOutDown');

    notificationTimeout = setTimeout(() => {
      hideNotification();
    }, 2500);
  }

  /**
   * Hides a notification.
   */
  function hideNotification() {
    if (notificationTimeout) {
      clearTimeout(notificationTimeout);
      notificationTimeout = null;
    }

    notificationElement.querySelector('span').setAttribute('role', '');
    notificationElement.classList.remove('fadeInUp');
    notificationElement.classList.add('fadeOutDown');
    notificationElement.querySelector('#notification-dismiss').style.display =
      'none';
  }

  /**
   * Sets the page title.
   * @param {string} title Title to display.
   */
  function setPageTitle(title) {
    if (!pageTitleContainer) {
      return;
    }

    pageTitleContainer.querySelector('h1').textContent = title;
  }

  /**
   * Copy some text to the user's clipboard.
   * @param {string} text Text to copy.
   */
  function copyText(text) {
    const fakeText = document.createElement('textarea');
    fakeText.classList.add('clipboardCopier');
    fakeText.textContent = text;
    document.body.appendChild(fakeText);
    fakeText.focus();
    fakeText.select();
    // TODO: switch to clipboard API.
    document.execCommand('Copy');
    document.body.removeChild(fakeText);
  }

  /**
   * Checks if a value is an arary.
   * @param {any} value Value to evaluate.
   * @return {boolean} true if the value is an array, otherwise false.
   */
  function isArray(value) {
    return value && typeof value === 'object' && value.constructor === Array;
  }

  /**
   * Clears all the children of an element.
   * @param {element} element Element to clear its children.
   */
  function clearChildren(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  /**
   * Adjusts the width of the interface if the container it's in is smaller than
   * a specific size.
   */
  function adjustWidthIfSmaller() {
    const realWidth = document.documentElement.clientWidth;
    if (realWidth < 500) {
      console.log('Editor is smaller than 500px!');
      document.body.style.minWidth = '100%';
      document.body.style.width = realWidth + 'px';
    }
  }

  /**
   * Filters the cookies based on keywords. Used for searching.
   * @param {element} target The searchbox.
   * @param {*} filterText The text to search for.
   */
  function filterCookies(target, filterText) {
    const cookies = cookiesListHtml.querySelectorAll('.cookie');
    filterText = filterText.toLowerCase();

    if (filterText) {
      target.classList.add('content');
    } else {
      target.classList.remove('content');
    }

    for (let i = 0; i < cookies.length; i++) {
      const cookieElement = cookies[i];
      const cookieName = cookieElement.children[0]
        .getElementsByTagName('span')[0]
        .textContent.toLocaleLowerCase();
      if (!filterText || cookieName.indexOf(filterText) > -1) {
        cookieElement.classList.remove('hide');
      } else {
        cookieElement.classList.add('hide');
      }
    }
  }

  /**
   * Handles the main logic of displaying ads. This will check if there are any
   * ads that can be displayed and will select a random one to display if there
   * are more than one valid option.
   */
  async function handleAd() {
    const canShow = await adHandler.canShowAnyAd();
    if (!canShow) {
      return;
    }
    const selectedAd = await adHandler.getRandomValidAd();
    if (selectedAd === false) {
      console.log('No valid ads to display');
      return;
    }
    clearAd();
    const adItemHtml = displayAd(selectedAd);
    document.getElementById('ad-container').appendChild(adItemHtml);
  }
  /**
   * Removes the currently displayed ad from the interface.
   */
  function clearAd() {
    clearChildren(document.getElementById('ad-container'));
  }

  /**
   * Creates the HTML to display an ad and assigns the event handlers.
   * @param {object} adObject Ad to display.
   * @return {string} The HTML representation of the ad.
   */
  function displayAd(adObject) {
    const template = document.importNode(
      document.getElementById('tmp-ad-item').content,
      true
    );
    const link = template.querySelector('.ad-link a');
    link.textContent = adObject.text;
    link.title = adObject.tooltip;
    link.href = adObject.url;

    template.querySelector('.dont-show').addEventListener('click', e => {
      clearAd();
      adHandler.markAdAsDismissed(adObject);
    });
    template.querySelector('.later').addEventListener('click', e => {
      clearAd();
    });

    return template;
  }

  // ========== SESSION MANAGEMENT FUNCTIONS ==========

  /**
   * Shows the form to save a new session.
   */
  function showSaveSessionForm() {
    setPageTitle('Session Manager - Save Session');
    disableButtons = true;
    
    const template = document.importNode(
      document.getElementById('tmp-save-session').content,
      true
    );
    
    Animate.transitionPage(
      containerCookie,
      containerCookie.firstChild,
      template.querySelector('form'),
      'left',
      () => {
        disableButtons = false;
      },
      optionHandler.getAnimationsEnabled()
    );
    
    setTimeout(() => {
      document.getElementById('session-name').focus();
    }, 100);
  }

  /**
   * Shows a dialog to save the current session.
   */
  async function showSaveSessionDialog() {
    // Ensure we have a current tab
    if (!cookieHandler.currentTab) {
      console.error('No current tab available');
      sendNotification('Error: No active tab found');
      return;
    }

    const domain = getDomainFromUrl(cookieHandler.currentTab.url) || 'Unknown';
    showSaveSessionModal(domain);
  }

  /**
   * Shows the save session modal with the domain pre-filled.
   * @param {string} domain The domain of the current tab.
   */
  function showSaveSessionModal(domain) {
    const modal = document.getElementById('saveSessionModal');
    const nameInput = document.getElementById('sessionNameInput');
    const domainInput = document.getElementById('sessionDomainInput');
    
    // Extract main domain name, ignoring common subdomains
    let defaultName = domain;
    if (domain.includes('.')) {
      const parts = domain.split('.');
      
      // Common subdomains to ignore
      const commonSubdomains = ['www', 'www2', 'www3', 'm', 'mobile', 'app', 'web', 'api', 'cdn', 'static'];
      
      // If first part is a common subdomain and there are more parts, use the second part
      if (parts.length >= 3 && commonSubdomains.includes(parts[0].toLowerCase())) {
        // Use the second part (e.g., "www.facebook.com" -> "facebook")
        defaultName = parts[1];
      } else if (parts.length >= 2) {
        // Use the first part (e.g., "facebook.com" -> "facebook")
        defaultName = parts[0];
      }
    }
    
    // Capitalize first letter
    defaultName = defaultName.charAt(0).toUpperCase() + defaultName.slice(1);
    
    // Set domain and default name
    domainInput.value = domain;
    nameInput.value = defaultName;
    
    // Show modal
    modal.style.display = 'flex';
    nameInput.focus();
  }

  /**
   * Hides the save session modal.
   */
  function hideSaveSessionModal() {
    const modal = document.getElementById('saveSessionModal');
    modal.style.display = 'none';
  }

  /**
   * Updates all UI text with current language translations.
   */
  function updateLanguage() {
    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      element.textContent = window.i18n.t(key);
    });

    // Update all placeholders with data-i18n-placeholder attribute
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      element.placeholder = window.i18n.t(key);
    });
  }

  /**
   * Saves the current cookies as a session with the given name.
   * @param {string} sessionName The name for the session.
   */
  async function saveCurrentSessionWithName(sessionName) {
    console.log('=== Saving session ===');
    console.log('Session name:', sessionName);
    console.log('Current tab:', cookieHandler.currentTab);
    console.log('Current tab URL:', cookieHandler.currentTab?.url);
    console.log('Current tab ID:', cookieHandler.currentTab?.id);

    // Verify we have a valid tab
    if (!cookieHandler.currentTab || !cookieHandler.currentTab.id) {
      console.error('Invalid current tab - cannot save session');
      sendNotification('Error: No active tab available');
      return;
    }

    // Get all cookies for the current tab
    cookieHandler.getAllCookies(async function (cookies) {
      console.log('Got cookies:', cookies?.length || 0);
      console.log('Cookies array:', cookies);
      
      // Get localStorage, sessionStorage, and IndexedDB
      let localStorageData = {};
      let sessionStorageData = {};
      let indexedDBData = {};
      
      try {
        const storageResult = await browserDetector.getApi().scripting.executeScript({
          target: { tabId: cookieHandler.currentTab.id },
          func: async () => {
            // Get localStorage - iterate through ALL keys
            const local = {};
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              local[key] = localStorage.getItem(key);
            }
            
            // Get sessionStorage - iterate through ALL keys
            const session = {};
            for (let i = 0; i < sessionStorage.length; i++) {
              const key = sessionStorage.key(i);
              session[key] = sessionStorage.getItem(key);
            }
            
            // Helper function to filter out multimedia and convert to serializable format
            const makeSerializable = (obj, depth = 0) => {
              if (obj === null || obj === undefined) return obj;
              
              // Prevent infinite recursion
              if (depth > 10) return '[Max depth reached]';
              
              // SKIP multimedia data - don't save it at all
              if (obj instanceof ArrayBuffer) {
                return '[ArrayBuffer - skipped]';
              }
              
              if (ArrayBuffer.isView(obj)) {
                return '[Binary data - skipped]';
              }
              
              if (obj instanceof Blob) {
                return '[Blob - skipped]';
              }
              
              // Handle Date
              if (obj instanceof Date) {
                return {
                  __type: 'Date',
                  value: obj.toISOString()
                };
              }

              // Continue with rest of makeSerializable logic...
              if (typeof obj === 'object' && obj !== null) {
                if (Array.isArray(obj)) {
                  return obj.map(item => makeSerializable(item, depth + 1));
                }
                
                const result = {};
                for (const key in obj) {
                  if (obj.hasOwnProperty(key)) {
                    try {
                      result[key] = makeSerializable(obj[key], depth + 1);
                    } catch (e) {
                      result[key] = '[Error serializing]';
                    }
                  }
                }
                return result;
              }
              
              return obj;
            };

            return { localStorage: local, sessionStorage: session };
          }
        });

        if (storageResult && storageResult[0] && storageResult[0].result) {
          localStorageData = storageResult[0].result.localStorage || {};
          sessionStorageData = storageResult[0].result.sessionStorage || {};
        }
      } catch (error) {
        console.error('Error getting storage data:', error);
      }

      // Create session object
      const session = {
        name: sessionName,
        domain: getDomainFromUrl(cookieHandler.currentTab.url),
        url: cookieHandler.currentTab.url,
        timestamp: Date.now(),
        cookies: cookies,
        localStorage: localStorageData,
        sessionStorage: sessionStorageData,
        indexedDB: indexedDBData
      };

      // Save to storage
      const sessions = await storageHandler.getLocal('sessions') || {};
      const sessionId = Date.now().toString();
      sessions[sessionId] = session;
      
      await storageHandler.setLocal('sessions', sessions);
      
      console.log('Session saved successfully:', sessionId);
      console.log('Session data:', session);
      console.log('Total cookies saved:', cookies?.length || 0);
      console.log('Total localStorage items:', Object.keys(localStorageData).length);
      console.log('Total sessionStorage items:', Object.keys(sessionStorageData).length);
      
      sendNotification(window.i18n.t('sessionSaved'), 'success');
      
      // Refresh the session list
      showRestoreSessionList();
    });
  }

  /**
   * Saves the current cookies as a session.
   * @deprecated Use showSaveSessionDialog() instead
   */
  async function saveCurrentSession() {
    console.log('saveCurrentSession function called (deprecated)');
    
    const sessionNameInput = document.getElementById('session-name');
    console.log('Session name input:', sessionNameInput);
    
    if (!sessionNameInput) {
      console.error('Session name input not found!');
      sendNotification('Error: Session name input not found');
      return;
    }
    
    const sessionName = sessionNameInput.value.trim();
    console.log('Session name value:', sessionName);
    
    if (!sessionName) {
      sendNotification('Please enter a session name');
      sessionNameInput.focus();
      return;
    }

    console.log('Saving session:', sessionName);
    console.log('Current tab:', cookieHandler.currentTab);

    // Get all cookies for the current tab
    cookieHandler.getAllCookies(async function (cookies) {
      console.log('Got cookies:', cookies.length);
      
      // Get localStorage, sessionStorage, and IndexedDB
      let localStorageData = {};
      let sessionStorageData = {};
      let indexedDBData = {};
      
      try {
        const storageResult = await browserDetector.getApi().scripting.executeScript({
          target: { tabId: cookieHandler.currentTab.id },
          func: async () => {
            // Get localStorage - iterate through ALL keys
            const local = {};
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              local[key] = localStorage.getItem(key);
            }
            
            // Get sessionStorage - iterate through ALL keys
            const session = {};
            for (let i = 0; i < sessionStorage.length; i++) {
              const key = sessionStorage.key(i);
              session[key] = sessionStorage.getItem(key);
            }
            
            // Helper function to filter out multimedia and convert to serializable format
            const makeSerializable = (obj, depth = 0) => {
              if (obj === null || obj === undefined) return obj;
              
              // Prevent infinite recursion
              if (depth > 10) return '[Max depth reached]';
              
              // SKIP multimedia data - don't save it at all
              if (obj instanceof ArrayBuffer) {
                return '[ArrayBuffer - skipped]';
              }
              
              if (ArrayBuffer.isView(obj)) {
                return '[Binary data - skipped]';
              }
              
              if (obj instanceof Blob) {
                return '[Blob - skipped]';
              }
              
              // Handle Date
              if (obj instanceof Date) {
                return {
                  __type: 'Date',
                  value: obj.toISOString()
                };
              }
              
              // Handle arrays
              if (Array.isArray(obj)) {
                return obj.map(item => makeSerializable(item, depth + 1));
              }
              
              // Handle objects
              if (typeof obj === 'object') {
                const result = {};
                for (const key in obj) {
                  if (obj.hasOwnProperty(key)) {
                    try {
                      const value = obj[key];
                      // Skip large binary fields
                      if (value instanceof ArrayBuffer || value instanceof Blob || ArrayBuffer.isView(value)) {
                        continue; // Don't include multimedia
                      }
                      result[key] = makeSerializable(value, depth + 1);
                    } catch (e) {
                      // Skip problematic fields
                    }
                  }
                }
                return result;
              }
              
              return obj;
            };
            
            // Get IndexedDB data
            const indexedDB = {};
            try {
              const databases = await window.indexedDB.databases();
              
              for (const dbInfo of databases) {
                const dbName = dbInfo.name;
                
                await new Promise((resolve, reject) => {
                  const request = window.indexedDB.open(dbName);
                  
                  request.onsuccess = async (event) => {
                    const db = event.target.result;
                    const storeNames = Array.from(db.objectStoreNames);
                    indexedDB[dbName] = {};
                    
                    for (const storeName of storeNames) {
                      try {
                        const transaction = db.transaction(storeName, 'readonly');
                        const store = transaction.objectStore(storeName);
                        const getAllRequest = store.getAll();
                        
                        await new Promise((resolveStore) => {
                          getAllRequest.onsuccess = () => {
                            // Make data serializable
                            const rawData = getAllRequest.result;
                            indexedDB[dbName][storeName] = makeSerializable(rawData);
                            resolveStore();
                          };
                          getAllRequest.onerror = () => resolveStore();
                        });
                      } catch (e) {
                        console.error('Error reading store:', storeName, e);
                      }
                    }
                    
                    db.close();
                    resolve();
                  };
                  
                  request.onerror = () => reject(request.error);
                });
              }
            } catch (e) {
              console.error('Error reading IndexedDB:', e);
            }
            
            return {
              localStorage: local,
              sessionStorage: session,
              indexedDB: indexedDB
            };
          }
        });
        
        if (storageResult && storageResult[0] && storageResult[0].result) {
          localStorageData = storageResult[0].result.localStorage || {};
          sessionStorageData = storageResult[0].result.sessionStorage || {};
          indexedDBData = storageResult[0].result.indexedDB || {};
          console.log('LocalStorage items:', Object.keys(localStorageData).length);
          console.log('SessionStorage items:', Object.keys(sessionStorageData).length);
          console.log('IndexedDB databases:', Object.keys(indexedDBData).length);
        }
      } catch (error) {
        console.error('Error getting storage:', error);
      }
      
      const sessionData = {
        name: sessionName,
        url: cookieHandler.currentTab.url,
        domain: getDomainFromUrl(cookieHandler.currentTab.url),
        cookieStoreId: cookieHandler.currentTab.cookieStoreId,
        cookies: cookies,
        localStorage: localStorageData,
        sessionStorage: sessionStorageData,
        indexedDB: indexedDBData,
        timestamp: new Date().toISOString(),
        cookieCount: cookies.length,
        localStorageCount: Object.keys(localStorageData).length,
        sessionStorageCount: Object.keys(sessionStorageData).length,
        indexedDBCount: Object.keys(indexedDBData).length
      };

      // Save to storage
      const existingSessions = await storageHandler.getLocal('sessions') || {};
      console.log('Existing sessions:', existingSessions);
      
      const sessionId = `session_${Date.now()}`;
      
      // Calculate session size
      const sessionSize = JSON.stringify(sessionData).length;
      console.log('Session size:', sessionSize, 'bytes', (sessionSize / 1024 / 1024).toFixed(2), 'MB');
      
      // Check if session is too large (Chrome storage limit is ~5MB per item)
      if (sessionSize > 4 * 1024 * 1024) { // 4MB threshold
        console.warn('Session is very large, may exceed storage quota');
        sendNotification('⚠️ Session is very large. Saving only essential data...');
        
        // Save only essential data (remove IndexedDB if too large)
        sessionData.indexedDB = {};
        sessionData.indexedDBCount = 0;
      }
      
      existingSessions[sessionId] = sessionData;
      
      try {
        await storageHandler.setLocal('sessions', existingSessions);
        console.log('Session saved to storage');
      } catch (error) {
        console.error('Error saving session:', error);
        
        if (error.message.includes('quota') || error.message.includes('QuotaBytes')) {
          // Try to save without IndexedDB
          console.log('Retrying without IndexedDB data...');
          sessionData.indexedDB = {};
          sessionData.indexedDBCount = 0;
          existingSessions[sessionId] = sessionData;
          
          try {
            await storageHandler.setLocal('sessions', existingSessions);
            sendNotification('⚠️ Session saved without IndexedDB (too large)');
            console.log('Session saved without IndexedDB');
          } catch (retryError) {
            console.error('Failed to save even without IndexedDB:', retryError);
            
            // Last resort: save only cookies, localStorage, and sessionStorage
            console.log('Final attempt: saving only cookies and storage...');
            const minimalSession = {
              name: sessionData.name,
              url: sessionData.url,
              domain: sessionData.domain,
              cookieStoreId: sessionData.cookieStoreId,
              cookies: sessionData.cookies,
              localStorage: sessionData.localStorage,
              sessionStorage: sessionData.sessionStorage,
              indexedDB: {},
              timestamp: sessionData.timestamp,
              cookieCount: sessionData.cookieCount,
              localStorageCount: sessionData.localStorageCount,
              sessionStorageCount: sessionData.sessionStorageCount,
              indexedDBCount: 0
            };
            
            existingSessions[sessionId] = minimalSession;
            
            try {
              await storageHandler.setLocal('sessions', existingSessions);
              sendNotification('⚠️ Session saved (cookies + localStorage + sessionStorage only)');
              console.log('Session saved with minimal data');
            } catch (finalError) {
              console.error('Failed to save minimal session:', finalError);
              sendNotification('❌ Failed to save session: Storage quota exceeded');
              return;
            }
          }
        } else {
          sendNotification('❌ Failed to save session: ' + error.message);
          return;
        }
      }

      console.log('Session saved:', sessionId, sessionData);
      const localCount = Object.keys(localStorageData).length;
      const sessionCount = Object.keys(sessionStorageData).length;
      const indexedCount = Object.keys(indexedDBData).length;
      sendNotification(`✅ Session "${sessionName}" saved: ${cookies.length} cookies, ${localCount} localStorage, ${sessionCount} sessionStorage, ${indexedCount} IndexedDB`);
      
      // Show the restore session list so user can see their saved session
      setTimeout(() => {
        showRestoreSessionList();
      }, 100);
    });
  }

  /**
   * Shows the list of saved sessions.
   */
  async function showRestoreSessionList() {
    // Check if developer mode is enabled
    const developerMode = await storageHandler.getLocal('developerMode') || false;
    
    // Show/hide elements based on developer mode
    const pageTitle = document.getElementById('pageTitle');
    
    if (developerMode) {
      // Show entire pageTitle section
      if (pageTitle) pageTitle.style.display = 'flex';
      setPageTitle(window.i18n.t('advancedSections'));
    } else {
      // Hide entire pageTitle section to avoid empty space
      if (pageTitle) pageTitle.style.display = 'none';
    }
    
    const sessionsContainer = document.getElementById('sessions-container');
    const sessions = await storageHandler.getLocal('sessions') || {};
    const sessionIds = Object.keys(sessions);

    // Clear container
    sessionsContainer.innerHTML = '';
    
    // Create header with save and import buttons
    const header = document.createElement('div');
    header.style.cssText = 'padding: 20px 24px; border-bottom: 1px solid #1a1a1a; background: #0a0a0a;';
    header.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h2 style="margin: 0; font-size: 16px; font-weight: 500; color: #fafafa; letter-spacing: -0.02em;">${window.i18n.t('savedSessions')}</h2>
        <div style="display: flex; gap: 8px; align-items: center;">
          <input type="file" id="import-session-input" accept=".json" style="display: none;">
          <button id="import-session-btn" style="background: #171717; color: #ededed; border: 1px solid #2a2a2a; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.15s ease;">
            ${window.i18n.t('import')}
          </button>
          <button id="save-session-btn" style="background: #fafafa; color: #000000; border: 1px solid #fafafa; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.15s ease;">
            ${window.i18n.t('saveCurrentSession')}
          </button>
          <button id="settings-btn" style="background: #171717; color: #ededed; border: 1px solid #2a2a2a; padding: 8px; border-radius: 6px; cursor: pointer; transition: all 0.15s ease; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;">
            <svg style="width: 18px; height: 18px; fill: currentColor;" viewBox="0 0 24 24">
              <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
            </svg>
          </button>
        </div>
      </div>
      <div style="position: relative;">
        <svg style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); width: 14px; height: 14px; fill: #666;" viewBox="0 0 24 24">
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        </svg>
        <input type="text" id="search-sessions" placeholder="${window.i18n.t('searchSessions')}" style="width: 100%; padding: 10px 12px 10px 36px; background: #0f0f0f; border: 1px solid #2a2a2a; border-radius: 6px; color: #fafafa; font-size: 13px; outline: none; transition: all 0.15s ease;">
      </div>
    `;
    sessionsContainer.appendChild(header);
    
    // Function to filter sessions based on search query
    function filterSessions(query) {
      const sessionItems = document.querySelectorAll('.session-item');
      let visibleCount = 0;
      
      sessionItems.forEach(item => {
        const sessionId = item.dataset.sessionId;
        const session = sessions[sessionId];
        
        if (!session) {
          item.style.display = 'none';
          return;
        }
        
        const name = session.name?.toLowerCase() || '';
        const domain = session.domain?.toLowerCase() || '';
        
        // Search in both name and domain
        if (name.includes(query) || domain.includes(query)) {
          item.style.display = 'flex';
          visibleCount++;
        } else {
          item.style.display = 'none';
        }
      });
      
      // Show "no results" message if needed
      const sessionsList = document.querySelector('#sessions-container > div:last-child');
      const noResultsMsg = document.getElementById('no-search-results');
      
      if (visibleCount === 0 && query !== '') {
        if (!noResultsMsg) {
          const msg = document.createElement('p');
          msg.id = 'no-search-results';
          msg.style.cssText = 'color: #666; text-align: center; padding: 40px 20px; font-size: 14px;';
          const noResultsText = window.i18n.getCurrentLanguage() === 'es' 
            ? `No se encontraron sesiones para "${query}"`
            : `No sessions found for "${query}"`;
          msg.textContent = noResultsText;
          sessionsList.appendChild(msg);
        }
      } else if (noResultsMsg) {
        noResultsMsg.remove();
      }
    }
    
    // Add hover effects and click handlers
    setTimeout(() => {
      const saveBtn = document.getElementById('save-session-btn');
      const importBtn = document.getElementById('import-session-btn');
      const importInput = document.getElementById('import-session-input');
      const settingsBtn = document.getElementById('settings-btn');
      
      if (saveBtn) {
        saveBtn.addEventListener('mouseenter', () => {
          saveBtn.style.background = '#ffffff';
          saveBtn.style.borderColor = '#ffffff';
        });
        saveBtn.addEventListener('mouseleave', () => {
          saveBtn.style.background = '#fafafa';
          saveBtn.style.borderColor = '#fafafa';
        });
        saveBtn.addEventListener('click', async () => {
          await showSaveSessionDialog();
        });
      }
      
      if (importBtn) {
        importBtn.addEventListener('mouseenter', () => {
          importBtn.style.background = '#262626';
          importBtn.style.borderColor = '#3a3a3a';
          importBtn.style.color = '#60a5fa';
        });
        importBtn.addEventListener('mouseleave', () => {
          importBtn.style.background = '#171717';
          importBtn.style.borderColor = '#2a2a2a';
          importBtn.style.color = '#ededed';
        });
        importBtn.addEventListener('click', () => {
          importInput.click();
        });
      }
      
      if (importInput) {
        importInput.addEventListener('change', (e) => {
          if (e.target.files[0]) {
            handleImportSession(e.target.files[0]);
          }
        });
      }

      if (settingsBtn) {
        settingsBtn.addEventListener('mouseenter', () => {
          settingsBtn.style.background = '#262626';
          settingsBtn.style.borderColor = '#3a3a3a';
        });
        settingsBtn.addEventListener('mouseleave', () => {
          settingsBtn.style.background = '#171717';
          settingsBtn.style.borderColor = '#2a2a2a';
        });
        settingsBtn.addEventListener('click', () => {
          // Open settings page in new tab
          const settingsUrl = browserDetector.getApi().runtime.getURL('interface/settings/settings.html');
          browserDetector.getApi().tabs.create({ url: settingsUrl });
        });
      }

      // Search functionality
      const searchInput = document.getElementById('search-sessions');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          filterSessions(e.target.value.toLowerCase());
        });
        
        searchInput.addEventListener('focus', () => {
          searchInput.style.borderColor = '#555555';
          searchInput.style.background = '#0a0a0a';
        });
        
        searchInput.addEventListener('blur', () => {
          searchInput.style.borderColor = '#2a2a2a';
          searchInput.style.background = '#0f0f0f';
        });
      }
    }, 0);

    // Create sessions list
    const sessionsList = document.createElement('div');
    sessionsList.style.cssText = 'padding: 10px;';

    if (sessionIds.length === 0) {
      const noSessionsText = window.i18n.getCurrentLanguage() === 'es' 
        ? 'No hay sesiones guardadas. Haz clic en "Guardar Sesión Actual" para guardar tu primera sesión.'
        : 'No saved sessions. Click "Save Current Session" to save your first session.';
      sessionsList.innerHTML = `<p style="color: #666; text-align: center; padding: 20px;">${noSessionsText}</p>`;
    } else {
      // Get current domain
      const currentDomain = cookieHandler.currentTab ? getDomainFromUrl(cookieHandler.currentTab.url) : '';
      
      // Sort sessions: current domain first, then by timestamp (newest first)
      const sortedSessionIds = sessionIds.sort((a, b) => {
        const sessionA = sessions[a];
        const sessionB = sessions[b];
        
        const domainA = sessionA.domain || '';
        const domainB = sessionB.domain || '';
        
        // Check if domains match current domain
        const aMatchesCurrent = domainA === currentDomain;
        const bMatchesCurrent = domainB === currentDomain;
        
        // If one matches current domain and the other doesn't, prioritize the match
        if (aMatchesCurrent && !bMatchesCurrent) return -1;
        if (!aMatchesCurrent && bMatchesCurrent) return 1;
        
        // If both match or both don't match, sort by timestamp (newest first)
        return (sessionB.timestamp || 0) - (sessionA.timestamp || 0);
      });
      
      sortedSessionIds.forEach(sessionId => {
        const session = sessions[sessionId];
        const sessionItem = createSessionItemHtml(sessionId, session);
        sessionsList.appendChild(sessionItem);
      });
    }
    
    sessionsContainer.appendChild(sessionsList);
  }

  /**
   * Creates the HTML for a session item.
   * @param {string} sessionId The ID of the session.
   * @param {object} session The session data.
   * @return {Element} The HTML element for the session.
   */
  function createSessionItemHtml(sessionId, session) {
    const date = new Date(session.timestamp);
    
    // Calculate counts from actual data
    const cookieCount = Array.isArray(session.cookies) ? session.cookies.length : 0;
    const localCount = session.localStorage ? Object.keys(session.localStorage).length : 0;
    const sessionCount = session.sessionStorage ? Object.keys(session.sessionStorage).length : 0;
    const indexedCount = session.indexedDB ? Object.keys(session.indexedDB).length : 0;
    
    // Format date and time separately
    const dateStr = date.toLocaleDateString();
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const timeStr = `${displayHours}:${minutes}${ampm}`;
    
    // Create session item with modern card design
    const sessionItem = document.createElement('div');
    sessionItem.className = 'session-item';
    sessionItem.dataset.sessionId = sessionId;
    
    // Get favicon URL using Google's favicon service
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${session.domain}&sz=64`;
    
    sessionItem.innerHTML = `
      <div style="display: flex; gap: 12px; align-items: flex-start; flex: 1;">
        <img src="${faviconUrl}" 
             alt="${session.name}" 
             style="width: 40px; height: 40px; border-radius: 8px; background: #1a1a1a; padding: 6px; border: 1px solid #2a2a2a; flex-shrink: 0;"
             onerror="this.style.display='none'">
        <div class="session-info" style="flex: 1; min-width: 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;">
              <div class="session-name" style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${session.name}">${session.name.length > 13 ? session.name.substring(0, 13) + '...' : session.name}</div>
              <div class="session-domain" style="font-size: 11px; color: #666;">${session.domain}</div>
              <div style="background: #000000; border: 1px solid #1a1a1a; padding: 4px 8px; border-radius: 4px; font-size: 10px; color: #d4d4d4; font-family: 'SF Mono', monospace; white-space: nowrap;">${dateStr}</div>
              <div style="background: #000000; border: 1px solid #1a1a1a; padding: 4px 8px; border-radius: 4px; font-size: 10px; color: #d4d4d4; font-family: 'SF Mono', monospace; white-space: nowrap;">${timeStr}</div>
            </div>
          </div>
          <div style="display: flex; gap: 12px; font-size: 11px; color: #888;">
            <div><span style="color: #666; text-transform: uppercase; font-size: 10px;">Cookies</span> <span style="color: #fafafa; font-weight: 500;">${cookieCount}</span></div>
            <div><span style="color: #666; text-transform: uppercase; font-size: 10px;">LocalStorage</span> <span style="color: #fafafa; font-weight: 500;">${localCount}</span></div>
            <div><span style="color: #666; text-transform: uppercase; font-size: 10px;">SessionStorage</span> <span style="color: #fafafa; font-weight: 500;">${sessionCount}</span></div>
            <div><span style="color: #666; text-transform: uppercase; font-size: 10px;">IndexedDB</span> <span style="color: #fafafa; font-weight: 500;">${indexedCount}</span></div>
          </div>
        </div>
      </div>
      <div class="session-actions">
        <button class="restore-btn">${window.i18n.t('restore')}</button>
        <button class="export-btn">${window.i18n.t('export')}</button>
        <button class="delete-btn">${window.i18n.t('delete')}</button>
      </div>
    `;
    
    // Add event listeners
    const restoreBtn = sessionItem.querySelector('.restore-btn');
    restoreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      restoreSession(sessionId, session);
    });

    const exportBtn = sessionItem.querySelector('.export-btn');
    exportBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      exportSession(sessionId, session);
    });

    const deleteBtn = sessionItem.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteSession(sessionId);
    });

    return sessionItem;
  }

  /**
   * Exports a session to JSON file.
   * @param {string} sessionId The ID of the session to export.
   * @param {object} session The session data.
   */
  async function exportSession(sessionId, session) {
    console.log('Exporting session:', sessionId, session);
    
    // Check if PIN is configured
    const settings = await storageHandler.getLocal('pinConfigured');
    if (settings) {
      // Show PIN verification modal
      showPinVerificationModal(sessionId, session);
      return;
    }
    
    // If no PIN configured, export directly
    performExport(sessionId, session);
  }

  /**
   * Performs the actual export after PIN verification.
   * @param {string} sessionId The ID of the session to export.
   * @param {object} session The session data.
   */
  function performExport(sessionId, session) {
    // Create JSON blob
    const jsonData = JSON.stringify(session, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create download link
    const a = document.createElement('a');
    a.href = url;
    a.download = `session_${session.name}_${sessionId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    sendNotification(window.i18n.t('sessionExported'), 'success');
  }

  /**
   * Shows domain mismatch warning modal.
   * @param {string} sessionId The ID of the session to restore.
   * @param {object} session The session data.
   * @param {string} currentDomain The current tab's domain.
   * @param {string} sessionDomain The session's original domain.
   */
  function showDomainMismatchModal(sessionId, session, currentDomain, sessionDomain) {
    const modal = document.createElement('div');
    modal.id = 'domain-mismatch-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(16px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    modal.innerHTML = `
      <div style="
        background: #0a0a0a;
        border-radius: 12px;
        width: 100%;
        max-width: 480px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
        border: 1px solid #1a1a1a;
      ">
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px;
          border-bottom: 1px solid #1a1a1a;
        ">
          <h2 style="
            font-size: 18px;
            color: #ededed;
            font-weight: 600;
            margin: 0;
          ">${window.i18n.t('domainMismatchDetected')}</h2>
          <button id="closeDomainModal" style="
            background: transparent;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: #666666;
            padding: 4px;
          ">&times;</button>
        </div>
        <div style="padding: 24px; padding-top: 16px;">
          <p style="color: #888888; font-size: 14px; margin-bottom: 16px; line-height: 1.6;">
            ${window.i18n.t('sessionSavedForDifferentDomain')}
          </p>
          <div style="
            background: #171717;
            border: 1px solid #2a2a2a;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 20px;
          ">
            <div style="margin-bottom: 12px;">
              <div style="color: #666666; font-size: 12px; margin-bottom: 4px;">${window.i18n.t('sessionDomain')}</div>
              <div style="color: #ededed; font-size: 14px; font-weight: 500;">${sessionDomain}</div>
            </div>
            <div>
              <div style="color: #666666; font-size: 12px; margin-bottom: 4px;">${window.i18n.t('currentDomain')}</div>
              <div style="color: #ef4444; font-size: 14px; font-weight: 500;">${currentDomain}</div>
            </div>
          </div>
          <p style="color: #888888; font-size: 13px; margin-bottom: 20px;">
            ${window.i18n.t('restoreAnywayWarning')}
          </p>
          <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button id="goToOriginalDomainBtn" style="
              background: rgba(34, 197, 94, 0.1);
              color: #22c55e;
              border: 1px solid rgba(34, 197, 94, 0.3);
              padding: 10px 20px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 500;
            ">${window.i18n.t('goToOriginalDomain')}</button>
            <button id="proceedDomainBtn" style="
              background: rgba(239, 68, 68, 0.1);
              color: #ef4444;
              border: 1px solid rgba(239, 68, 68, 0.3);
              padding: 10px 20px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 500;
            ">${window.i18n.t('restoreAnyway')}</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    document.getElementById('closeDomainModal').addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    document.getElementById('goToOriginalDomainBtn').addEventListener('click', async () => {
      document.body.removeChild(modal);
      // Navigate to original domain
      const protocol = sessionDomain.includes('localhost') ? 'http://' : 'https://';
      const url = protocol + sessionDomain;
      await browserDetector.getApi().tabs.update(cookieHandler.currentTab.id, { url: url });
    });

    document.getElementById('proceedDomainBtn').addEventListener('click', () => {
      document.body.removeChild(modal);
      performRestore(sessionId, session);
    });

    // Close on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }

  /**
   * Shows PIN verification modal for export.
   * @param {string} sessionId The ID of the session to export.
   * @param {object} session The session data.
   */
  function showPinVerificationModal(sessionId, session) {
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'pin-verification-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(16px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    modal.innerHTML = `
      <div style="
        background: #0a0a0a;
        border-radius: 12px;
        width: 100%;
        max-width: 400px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
        border: 1px solid #1a1a1a;
      ">
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px;
          border-bottom: 1px solid #1a1a1a;
        ">
          <h2 style="
            font-size: 18px;
            color: #ededed;
            font-weight: 600;
            margin: 0;
          ">${window.i18n.t('verifyPinToExport')}</h2>
          <button id="closePinModal" style="
            background: transparent;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: #666666;
            padding: 4px;
          ">&times;</button>
        </div>
        <div style="padding: 24px; padding-top: 16px;">
          <p style="color: #888888; font-size: 14px; margin-bottom: 16px;">
            ${window.i18n.t('enterPinToExport')}
          </p>
          <form id="pinVerificationForm">
            <input type="password" id="pinVerificationInput" placeholder="${window.i18n.t('enterYourPin')}" maxlength="6" autocomplete="off" style="
              width: 100%;
              padding: 10px 12px;
              background: #171717;
              border: 1px solid #2a2a2a;
              border-radius: 6px;
              color: #ededed;
              font-size: 14px;
              outline: none;
              margin-bottom: 12px;
            ">
            <div id="pinVerificationError" style="
              display: none;
              background: rgba(239, 68, 68, 0.1);
              border: 1px solid rgba(239, 68, 68, 0.3);
              color: #ef4444;
              padding: 10px;
              border-radius: 6px;
              font-size: 13px;
              margin-bottom: 16px;
            ">${window.i18n.t('incorrectPin')}</div>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
              <button type="button" id="cancelPinBtn" style="
                background: #262626;
                color: #ededed;
                border: 1px solid #3a3a3a;
                padding: 10px 20px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
              ">${window.i18n.t('cancel')}</button>
              <button type="submit" style="
                background: #fafafa;
                color: #000000;
                border: 1px solid #fafafa;
                padding: 10px 20px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
              ">${window.i18n.t('verify')}</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Focus input
    setTimeout(() => {
      document.getElementById('pinVerificationInput').focus();
    }, 100);

    // Event listeners
    document.getElementById('closePinModal').addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    document.getElementById('cancelPinBtn').addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    document.getElementById('pinVerificationForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const pin = document.getElementById('pinVerificationInput').value;
      const errorDiv = document.getElementById('pinVerificationError');

      try {
        // Verify PIN
        const pinHash = await storageHandler.getLocal('pinHash');
        const pinSalt = await storageHandler.getLocal('pinSalt');
        
        if (!pinHash || !pinSalt) {
          throw new Error('PIN no configurado');
        }

        // Hash the entered PIN
        const encoder = new TextEncoder();
        const passwordData = encoder.encode(pin);
        const saltData = new Uint8Array(pinSalt.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
        
        const keyMaterial = await crypto.subtle.importKey(
          'raw',
          passwordData,
          'PBKDF2',
          false,
          ['deriveBits']
        );
        
        const derivedBits = await crypto.subtle.deriveBits(
          {
            name: 'PBKDF2',
            salt: saltData,
            iterations: 100000,
            hash: 'SHA-256'
          },
          keyMaterial,
          256
        );
        
        const hashArray = Array.from(new Uint8Array(derivedBits));
        const hashedPin = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        if (hashedPin === pinHash) {
          // PIN correct, proceed with export
          document.body.removeChild(modal);
          performExport(sessionId, session);
        } else {
          // PIN incorrect
          errorDiv.style.display = 'block';
          document.getElementById('pinVerificationInput').value = '';
          document.getElementById('pinVerificationInput').focus();
        }
      } catch (error) {
        console.error('Error verifying PIN:', error);
        errorDiv.textContent = error.message;
        errorDiv.style.display = 'block';
      }
    });

    // Close on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }

  /**
   * Handles importing a session from JSON file.
   * @param {File} file The JSON file to import.
   */
  async function handleImportSession(file) {
    if (!file) {
      return;
    }

    console.log('Importing session from file:', file.name);

    try {
      const text = await file.text();
      const sessionData = JSON.parse(text);

      // Validate session data
      if (!sessionData.name || !sessionData.domain || !sessionData.cookies) {
        sendNotification('❌ Invalid session file format');
        return;
      }

      // Generate new session ID
      const sessionId = Date.now().toString();

      // Get existing sessions
      const sessions = await storageHandler.getLocal('sessions') || {};

      // Add imported session
      sessions[sessionId] = {
        ...sessionData,
        timestamp: Date.now() // Update timestamp to import time
      };

      // Save to storage
      await storageHandler.setLocal('sessions', sessions);

      sendNotification(window.i18n.t('sessionImported'), 'success');

      // Refresh the session list
      showRestoreSessionList();

    } catch (error) {
      console.error('Error importing session:', error);
      sendNotification('❌ Failed to import session: Invalid JSON file');
    }

    // Reset file input
    document.getElementById('import-session-input').value = '';
  }

  /**
   * Restores a saved session.
   * @param {string} sessionId The ID of the session to restore.
   * @param {object} session The session data.
   */
  async function restoreSession(sessionId, session) {
    console.log('Restoring session:', sessionId, session);
    
    // Validate session data
    if (!session) {
      console.error('Invalid session data');
      sendNotification('❌ Invalid session data');
      return;
    }

    // Check if current domain matches session domain
    const currentUrl = getCurrentTabUrl();
    const currentDomain = getDomainFromUrl(currentUrl);
    const sessionDomain = session.domain;

    if (sessionDomain && currentDomain !== sessionDomain) {
      // Show domain mismatch warning
      showDomainMismatchModal(sessionId, session, currentDomain, sessionDomain);
      return;
    }

    // If domains match or no domain in session, proceed with restore
    performRestore(sessionId, session);
  }

  /**
   * Performs the actual session restoration.
   * @param {string} sessionId The ID of the session to restore.
   * @param {object} session The session data.
   */
  async function performRestore(sessionId, session) {
    console.log('Performing restore for session:', sessionId);

    // First, delete all current cookies
    cookieHandler.getAllCookies(async function (currentCookies) {
      console.log('Deleting', currentCookies.length, 'current cookies...');
      
      for (const cookie of currentCookies) {
        await new Promise(resolve => {
          cookieHandler.removeCookie(cookie.name, getCurrentTabUrl(), resolve);
        });
      }

      const cookiesToRestore = session.cookies || [];
      console.log('Current cookies deleted. Restoring', cookiesToRestore.length, 'saved cookies...');

      // Restore saved cookies
      let restored = 0;
      let failed = 0;

      for (const cookie of cookiesToRestore) {
        // Update storeId to current tab's store
        cookie.storeId = cookieHandler.currentTab.cookieStoreId;

        await new Promise(resolve => {
          cookieHandler.saveCookie(cookie, getCurrentTabUrl(), function (error, result) {
            if (error) {
              console.error('Failed to restore cookie:', cookie.name, error);
              failed++;
            } else {
              console.log('Restored cookie:', cookie.name);
              restored++;
            }
            resolve();
          });
        });
      }

      console.log(`Cookies restoration complete: ${restored} restored, ${failed} failed`);
      
      // Restore localStorage and sessionStorage first (simpler, synchronous)
      console.log('About to restore localStorage and sessionStorage...');
      console.log('localStorage data:', session.localStorage);
      console.log('sessionStorage data:', session.sessionStorage);
      
      try {
        const storageResult = await browserDetector.getApi().scripting.executeScript({
          target: { tabId: cookieHandler.currentTab.id },
          func: (localData, sessionData) => {
            console.log('Inside script - Restoring localStorage and sessionStorage...');
            console.log('localData received:', Object.keys(localData).length);
            console.log('sessionData received:', Object.keys(sessionData).length);
            
            // Clear existing storage
            localStorage.clear();
            sessionStorage.clear();
            
            // Restore localStorage
            let localRestored = 0;
            for (const [key, value] of Object.entries(localData)) {
              try {
                localStorage.setItem(key, value);
                localRestored++;
              } catch (e) {
                console.error('Failed to restore localStorage item:', key, e);
              }
            }
            
            // Restore sessionStorage
            let sessionRestored = 0;
            for (const [key, value] of Object.entries(sessionData)) {
              try {
                sessionStorage.setItem(key, value);
                sessionRestored++;
              } catch (e) {
                console.error('Failed to restore sessionStorage item:', key, e);
              }
            }
            
            console.log(`Restored ${localRestored} localStorage, ${sessionRestored} sessionStorage`);
            return { localRestored, sessionRestored };
          },
          args: [session.localStorage || {}, session.sessionStorage || {}]
        });
        
        console.log('localStorage and sessionStorage restored:', storageResult);
      } catch (error) {
        console.error('Error restoring localStorage/sessionStorage:', error);
        console.error('Error details:', error.message, error.stack);
      }

      // Restore IndexedDB (more complex, asynchronous)
      const indexedData = session.indexedDB || {};
      console.log('IndexedDB data to restore:', indexedData);
      console.log('IndexedDB databases count:', Object.keys(indexedData).length);
      
      // Only use timer if there's IndexedDB data to restore
      let reloadTimer = null;
      
      if (Object.keys(indexedData).length > 0) {
        // Schedule page reload in 2 seconds if IndexedDB restoration takes too long
        reloadTimer = setTimeout(() => {
          console.log('2 seconds elapsed - Reloading page...');
          browserDetector.getApi().tabs.reload(cookieHandler.currentTab.id);
        }, 2000);
        console.log('Starting IndexedDB restoration...');
        try {
          const indexedResult = await browserDetector.getApi().scripting.executeScript({
            target: { tabId: cookieHandler.currentTab.id },
            func: (indexedData) => {
              return new Promise(async (mainResolve) => {
                console.log('Inside script - Restoring IndexedDB...');
                console.log('IndexedDB data received:', Object.keys(indexedData));
            
            // Helper to deserialize data back to original format
            const deserialize = (obj) => {
              if (obj === null || obj === undefined) return obj;
              
              if (obj.__type === 'ArrayBuffer') {
                return new Uint8Array(obj.data).buffer;
              }
              
              if (obj.__type === 'Uint8Array') {
                return new Uint8Array(obj.data);
              }
              
              if (obj.__type === 'Date') {
                return new Date(obj.value);
              }
              
              if (Array.isArray(obj)) {
                return obj.map(deserialize);
              }
              
              if (typeof obj === 'object') {
                const result = {};
                for (const key in obj) {
                  if (obj.hasOwnProperty(key)) {
                    result[key] = deserialize(obj[key]);
                  }
                }
                return result;
              }
              
              return obj;
            };
                
                // Restore IndexedDB
                try {
                  for (const [dbName, stores] of Object.entries(indexedData)) {
                    console.log(`Restoring database: ${dbName}`);
                    
                    // Delete existing database first
                    await new Promise((resolve) => {
                      const deleteRequest = window.indexedDB.deleteDatabase(dbName);
                      deleteRequest.onsuccess = () => resolve();
                      deleteRequest.onerror = () => resolve();
                      deleteRequest.onblocked = () => resolve();
                    });
                    
                    // Get store names and create database
                    const storeNames = Object.keys(stores);
                    if (storeNames.length === 0) continue;
                    
                    await new Promise((resolve, reject) => {
                      const openRequest = window.indexedDB.open(dbName, 1);
                      
                      openRequest.onupgradeneeded = (event) => {
                        const db = event.target.result;
                        
                        // Create object stores
                        for (const storeName of storeNames) {
                          if (!db.objectStoreNames.contains(storeName)) {
                            db.createObjectStore(storeName, { autoIncrement: true });
                          }
                        }
                      };
                      
                      openRequest.onsuccess = async (event) => {
                        const db = event.target.result;
                        
                        // Populate stores with data
                        for (const [storeName, data] of Object.entries(stores)) {
                          try {
                            const transaction = db.transaction(storeName, 'readwrite');
                            const store = transaction.objectStore(storeName);
                            
                            // Deserialize and add all items
                            const deserializedData = deserialize(data);
                            for (const item of deserializedData) {
                              store.add(item);
                            }
                            
                            await new Promise((resolveTransaction) => {
                              transaction.oncomplete = () => resolveTransaction();
                              transaction.onerror = () => resolveTransaction();
                            });
                          } catch (e) {
                            console.error('Error restoring store:', storeName, e);
                          }
                        }
                        
                        db.close();
                        resolve();
                      };
                      
                      openRequest.onerror = () => reject(openRequest.error);
                    });
                  }
                  
                  console.log('IndexedDB restoration complete');
                  mainResolve({ success: true });
                } catch (e) {
                  console.error('Error restoring IndexedDB:', e);
                  mainResolve({ success: false, error: e.message });
                }
              });
            },
            args: [indexedData]
          });
          
          console.log('IndexedDB restored successfully - canceling timer and reloading now');
          if (reloadTimer) {
            clearTimeout(reloadTimer);
          }
          
          // Wait a bit for IndexedDB to fully commit, then reload
          setTimeout(() => {
            console.log('Reloading page after successful IndexedDB restoration...');
            browserDetector.getApi().tabs.reload(cookieHandler.currentTab.id);
          }, 500);
        } catch (error) {
          console.error('Error restoring IndexedDB:', error);
          console.log('IndexedDB restoration failed, but page will reload in 2 seconds anyway');
        }
      } else {
        console.log('No IndexedDB data to restore - reloading immediately');
        // No IndexedDB, reload immediately
        setTimeout(() => {
          browserDetector.getApi().tabs.reload(cookieHandler.currentTab.id);
        }, 100);
      }
      
      const localCount = session.localStorageCount || 0;
      const sessionCount = session.sessionStorageCount || 0;
      const indexedCount = session.indexedDBCount || 0;
      
      const message = window.i18n.getCurrentLanguage() === 'es'
        ? `Sesión restaurada: ${restored} cookies, ${localCount} localStorage, ${sessionCount} sessionStorage${Object.keys(indexedData).length > 0 ? `, ${indexedCount} IndexedDB` : ''}`
        : `Session restored: ${restored} cookies, ${localCount} localStorage, ${sessionCount} sessionStorage${Object.keys(indexedData).length > 0 ? `, ${indexedCount} IndexedDB` : ''}`;
      
      sendNotification(message, 'success');
    });
  }

  /**
   * Deletes a saved session.
   * @param {string} sessionId The ID of the session to delete.
   */
  async function deleteSession(sessionId) {
    const sessions = await storageHandler.getLocal('sessions') || {};
    const sessionName = sessions[sessionId]?.name || 'Unknown';
    
    delete sessions[sessionId];
    await storageHandler.setLocal('sessions', sessions);

    console.log('Session deleted:', sessionId);
    sendNotification(window.i18n.t('sessionDeleted'), 'success');
    
    // Refresh the list
    showRestoreSessionList();
  }

  // ========== END SESSION MANAGEMENT FUNCTIONS ==========

  // ========== STORAGE TAB FUNCTIONS ==========

  let currentStorageTab = 'cookies';

  /**
   * Switches between Cookies, LocalStorage, and SessionStorage tabs.
   * @param {string} tab The tab to switch to ('cookies', 'localStorage', 'sessionStorage')
   */
  function switchStorageTab(tab) {
    currentStorageTab = tab;
    
    // Update active tab button
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.tab === tab) {
        btn.classList.add('active');
      }
    });

    const sessionsContainer = document.getElementById('sessions-container');
    const cookieContainer = document.getElementById('cookie-container');
    
    if (tab === 'sessions') {
      sessionsContainer.style.display = 'block';
      cookieContainer.style.display = 'none';
      showRestoreSessionList();
    } else {
      sessionsContainer.style.display = 'none';
      cookieContainer.style.display = 'block';
      
      if (tab === 'cookies') {
        showCookiesForTab();
      } else if (tab === 'localStorage') {
        showLocalStorageForTab();
      } else if (tab === 'sessionStorage') {
        showSessionStorageForTab();
      }
    }
  }

  /**
   * Shows localStorage items for the current tab.
   */
  async function showLocalStorageForTab() {
    if (!cookieHandler.currentTab) {
      return;
    }

    console.log('Showing localStorage');
    setPageTitle('Session Manager - LocalStorage');

    try {
      const result = await browserDetector.getApi().scripting.executeScript({
        target: { tabId: cookieHandler.currentTab.id },
        func: () => {
          const items = {};
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            items[key] = localStorage.getItem(key);
          }
          return items;
        }
      });

      const localStorageItems = result[0]?.result || {};
      displayStorageItems(localStorageItems, 'localStorage');
    } catch (error) {
      console.error('Error getting localStorage:', error);
      showNoStorage('localStorage');
    }
  }

  /**
   * Shows sessionStorage items for the current tab.
   */
  async function showSessionStorageForTab() {
    if (!cookieHandler.currentTab) {
      return;
    }

    console.log('Showing sessionStorage');
    setPageTitle('Session Manager - SessionStorage');

    try {
      const result = await browserDetector.getApi().scripting.executeScript({
        target: { tabId: cookieHandler.currentTab.id },
        func: () => {
          const items = {};
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            items[key] = sessionStorage.getItem(key);
          }
          return items;
        }
      });

      const sessionStorageItems = result[0]?.result || {};
      displayStorageItems(sessionStorageItems, 'sessionStorage');
    } catch (error) {
      console.error('Error getting sessionStorage:', error);
      showNoStorage('sessionStorage');
    }
  }

  /**
   * Displays storage items in the UI.
   * @param {object} items The storage items to display
   * @param {string} storageType 'localStorage' or 'sessionStorage'
   */
  function displayStorageItems(items, storageType) {
    const keys = Object.keys(items);
    
    if (keys.length === 0) {
      showNoStorage(storageType);
      return;
    }

    const listHtml = document.createElement('ul');
    listHtml.className = 'storage-item-list';

    keys.forEach(key => {
      const value = items[key];
      const itemHtml = createStorageItemHtml(key, value, storageType);
      listHtml.appendChild(itemHtml);
    });

    if (containerCookie.firstChild) {
      disableButtons = true;
      Animate.transitionPage(
        containerCookie,
        containerCookie.firstChild,
        listHtml,
        'right',
        () => {
          disableButtons = false;
        },
        optionHandler.getAnimationsEnabled()
      );
    } else {
      containerCookie.appendChild(listHtml);
    }
  }

  /**
   * Creates HTML for a storage item (cookie-like expandable design).
   * @param {string} key The storage key
   * @param {string} value The storage value
   * @param {string} storageType 'localStorage' or 'sessionStorage'
   * @return {Element} The HTML element
   */
  function createStorageItemHtml(key, value, storageType) {
    const li = document.createElement('li');
    li.className = 'cookie';
    li.dataset.name = key;
    li.dataset.storageType = storageType;

    // Header (collapsed view)
    const header = document.createElement('div');
    header.className = 'header container';
    header.tabIndex = 0;
    header.role = 'button';
    header.setAttribute('aria-expanded', 'false');

    // Arrow icon
    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    arrow.classList.add('icon', 'arrow');
    const arrowUse = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    arrowUse.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '../sprites/solid.svg#angle-down');
    arrow.appendChild(arrowUse);

    // Key name
    const headerName = document.createElement('span');
    headerName.className = 'header-name';
    headerName.textContent = key;

    // Value preview (truncated)
    const headerExtra = document.createElement('span');
    headerExtra.className = 'header-extra-info';
    const truncatedValue = value.length > 50 ? value.substring(0, 50) + '...' : value;
    headerExtra.textContent = truncatedValue;

    // Delete button
    const btns = document.createElement('div');
    btns.className = 'btns';
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete';
    deleteBtn.setAttribute('data-tooltip-left', 'Delete');
    deleteBtn.setAttribute('aria-label', 'Delete');
    deleteBtn.tabIndex = -1;
    deleteBtn.type = 'button';
    
    const deleteIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    deleteIcon.classList.add('icon');
    const deleteUse = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    deleteUse.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '../sprites/solid.svg#trash');
    deleteIcon.appendChild(deleteUse);
    deleteBtn.appendChild(deleteIcon);
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteStorageItem(key, storageType);
    });

    btns.appendChild(deleteBtn);

    // Assemble header
    header.appendChild(arrow);
    header.appendChild(headerName);
    header.appendChild(headerExtra);
    header.appendChild(btns);

    // Expando (expanded view)
    const expando = document.createElement('div');
    expando.className = 'expando';
    expando.setAttribute('aria-hidden', 'true');
    expando.role = 'region';

    const wrapper = document.createElement('div');
    wrapper.className = 'wrapper';

    // Action buttons (same as cookies)
    const actionBtns = document.createElement('div');
    actionBtns.className = 'action-btns';

    // Delete button with icon
    const deleteActionBtn = document.createElement('button');
    deleteActionBtn.className = 'delete';
    deleteActionBtn.setAttribute('data-tooltip', 'Delete');
    deleteActionBtn.setAttribute('aria-label', 'Delete');
    deleteActionBtn.type = 'button';
    
    const deleteActionIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    deleteActionIcon.classList.add('icon');
    const deleteActionUse = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    deleteActionUse.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '../sprites/solid.svg#trash');
    deleteActionIcon.appendChild(deleteActionUse);
    deleteActionBtn.appendChild(deleteActionIcon);
    deleteActionBtn.addEventListener('click', (e) => {
      e.preventDefault();
      deleteStorageItem(key, storageType);
    });

    // Save button with icon
    const saveBtn = document.createElement('button');
    saveBtn.className = 'save';
    saveBtn.setAttribute('data-tooltip', 'Save');
    saveBtn.setAttribute('aria-label', 'Save');
    saveBtn.type = 'submit';
    
    const saveIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    saveIcon.classList.add('icon');
    const saveUse = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    saveUse.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '../sprites/solid.svg#save');
    saveIcon.appendChild(saveUse);
    saveBtn.appendChild(saveIcon);

    actionBtns.appendChild(deleteActionBtn);
    actionBtns.appendChild(saveBtn);

    // Form (same structure as cookies)
    const form = document.createElement('form');
    form.className = 'form container';
    form.dataset.id = key;

    // Key field
    const keyDiv = document.createElement('div');
    const keyLabel = document.createElement('label');
    keyLabel.className = 'label-name';
    keyLabel.textContent = 'Key';
    const keyInput = document.createElement('input');
    keyInput.name = 'key';
    keyInput.type = 'text';
    keyInput.className = 'input-name';
    keyInput.value = key;
    keyInput.dataset.originalKey = key; // Store original key for updates
    keyDiv.appendChild(keyLabel);
    keyDiv.appendChild(keyInput);

    // Value field
    const valueDiv = document.createElement('div');
    const valueLabel = document.createElement('label');
    valueLabel.className = 'label-value';
    valueLabel.textContent = 'Value';
    const valueTextarea = document.createElement('textarea');
    valueTextarea.name = 'value';
    valueTextarea.className = 'input-value';
    valueTextarea.value = value;
    valueDiv.appendChild(valueLabel);
    valueDiv.appendChild(valueTextarea);

    form.appendChild(keyDiv);
    form.appendChild(valueDiv);

    // Form submit handler
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const originalKey = keyInput.dataset.originalKey;
      const newKey = keyInput.value;
      const newValue = valueTextarea.value;
      
      // If key changed, delete old and create new
      if (originalKey !== newKey) {
        await deleteStorageItem(originalKey, storageType, false); // Don't show confirmation
        await setStorageItem(newKey, newValue, storageType);
      } else {
        // Just update the value
        await updateStorageItem(originalKey, newValue, storageType);
      }
      
      // Refresh view
      if (storageType === 'localStorage') {
        showLocalStorageForTab();
      } else {
        showSessionStorageForTab();
      }
    });

    wrapper.appendChild(actionBtns);
    wrapper.appendChild(form);
    expando.appendChild(wrapper);

    // Assemble item
    li.appendChild(header);
    li.appendChild(expando);

    // Add click handler to toggle expansion
    header.addEventListener('click', (e) => {
      if (e.target.closest('.delete')) return;
      toggleStorageExpando(li);
    });

    header.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleStorageExpando(li);
      }
    });

    return li;
  }

  /**
   * Toggles the expansion of a storage item.
   * @param {Element} li The list item element
   */
  function toggleStorageExpando(li) {
    const header = li.querySelector('.header');
    const expando = li.querySelector('.expando');
    const isExpanded = header.getAttribute('aria-expanded') === 'true';

    if (isExpanded) {
      // Collapse
      header.setAttribute('aria-expanded', 'false');
      expando.setAttribute('aria-hidden', 'true');
      Animate.collapse(expando);
    } else {
      // Expand
      header.setAttribute('aria-expanded', 'true');
      expando.setAttribute('aria-hidden', 'false');
      Animate.expand(expando);
    }
  }


  /**
   * Updates a storage item value.
   * @param {string} key The storage key
   * @param {string} newValue The new value
   * @param {string} storageType 'localStorage' or 'sessionStorage'
   */
  async function updateStorageItem(key, newValue, storageType) {
    try {
      await browserDetector.getApi().scripting.executeScript({
        target: { tabId: cookieHandler.currentTab.id },
        func: (type, k, v) => {
          if (type === 'localStorage') {
            localStorage.setItem(k, v);
          } else {
            sessionStorage.setItem(k, v);
          }
        },
        args: [storageType, key, newValue]
      });
      sendNotification(`${storageType} item updated`);
    } catch (error) {
      console.error(`Error updating ${storageType}:`, error);
      sendNotification(`❌ Error updating ${storageType} item`);
    }
  }

  /**
   * Edits a storage item.
   * @param {string} key The storage key
   * @param {string} currentValue The current value
   * @param {string} storageType 'localStorage' or 'sessionStorage'
   */
  async function editStorageItem(key, currentValue, storageType) {
    const newValue = prompt(`Edit ${storageType} item:\n\nKey: ${key}\n\nEnter new value:`, currentValue);
    
    if (newValue === null) {
      return; // User cancelled
    }

    try {
      await browserDetector.getApi().scripting.executeScript({
        target: { tabId: cookieHandler.currentTab.id },
        func: (type, k, v) => {
          if (type === 'localStorage') {
            localStorage.setItem(k, v);
          } else {
            sessionStorage.setItem(k, v);
          }
        },
        args: [storageType, key, newValue]
      });

      sendNotification(`✅ ${storageType} item updated`);
      
      // Refresh the view
      if (storageType === 'localStorage') {
        showLocalStorageForTab();
      } else {
        showSessionStorageForTab();
      }
    } catch (error) {
      console.error('Error updating storage item:', error);
      sendNotification(`❌ Error updating ${storageType} item`);
    }
  }

  /**
   * Sets a storage item.
   * @param {string} key The storage key
   * @param {string} value The value
   * @param {string} storageType 'localStorage' or 'sessionStorage'
   */
  async function setStorageItem(key, value, storageType) {
    try {
      await browserDetector.getApi().scripting.executeScript({
        target: { tabId: cookieHandler.currentTab.id },
        func: (type, k, v) => {
          if (type === 'localStorage') {
            localStorage.setItem(k, v);
          } else {
            sessionStorage.setItem(k, v);
          }
        },
        args: [storageType, key, value]
      });
      sendNotification(`${storageType} item created`);
    } catch (error) {
      console.error(`Error creating ${storageType}:`, error);
      sendNotification(`❌ Error creating ${storageType} item`);
    }
  }

  /**
   * Deletes a storage item.
   * @param {string} key The storage key
   * @param {string} storageType 'localStorage' or 'sessionStorage'
   * @param {boolean} confirm Whether to show confirmation dialog (default: true)
   */
  async function deleteStorageItem(key, storageType, showConfirm = true) {
    if (showConfirm && !confirm(`Delete ${storageType} item "${key}"?`)) {
      return;
    }

    try {
      await browserDetector.getApi().scripting.executeScript({
        target: { tabId: cookieHandler.currentTab.id },
        func: (type, k) => {
          if (type === 'localStorage') {
            localStorage.removeItem(k);
          } else {
            sessionStorage.removeItem(k);
          }
        },
        args: [storageType, key]
      });

      sendNotification(`✅ ${storageType} item deleted`);
      
      // Refresh the view
      if (storageType === 'localStorage') {
        showLocalStorageForTab();
      } else {
        showSessionStorageForTab();
      }
    } catch (error) {
      console.error('Error deleting storage item:', error);
      sendNotification(`❌ Error deleting ${storageType} item`);
    }
  }

  /**
   * Shows a message when there are no storage items.
   * @param {string} storageType 'localStorage' or 'sessionStorage'
   */
  function showNoStorage(storageType) {
    // Only show this message if we're actually on the localStorage or sessionStorage tab
    if (currentStorageTab !== 'localStorage' && currentStorageTab !== 'sessionStorage') {
      return;
    }
    
    const html = document.createElement('p');
    html.className = 'container';
    html.style.textAlign = 'center';
    html.style.padding = '40px';
    html.style.color = 'var(--secondary-text-color, #666)';
    
    // Use the correct translation key based on storage type
    const translationKey = storageType === 'localStorage' ? 'noLocalStorage' : 'noSessionStorage';
    html.textContent = window.i18n.t(translationKey);

    if (containerCookie.firstChild) {
      disableButtons = true;
      Animate.transitionPage(
        containerCookie,
        containerCookie.firstChild,
        html,
        'right',
        () => {
          disableButtons = false;
        },
        optionHandler.getAnimationsEnabled()
      );
    } else {
      containerCookie.appendChild(html);
    }
  }

  // ========== END STORAGE TAB FUNCTIONS ==========

  /**
   * Handles the changes required to the interface when the options are changed
   * by an external source.
   * @param {Option} oldOptions the options before changes.
   */
  function onOptionsChanged(oldOptions) {
    handleAnimationsEnabled();
    moveButtonBar();
    if (oldOptions.advancedCookies != optionHandler.getCookieAdvanced()) {
      document.querySelector('#advanced-toggle-all').checked =
        optionHandler.getCookieAdvanced();
      showCookiesForTab();
    }

    if (oldOptions.extraInfo != optionHandler.getExtraInfo()) {
      showCookiesForTab();
    }
  }

  /**
   * Moves the button bar to the top or bottom depending on the user preference
   */
  function moveButtonBar() {
    const siblingElement = optionHandler.getButtonBarTop()
      ? document.getElementById('pageTitle').nextSibling
      : document.body.lastChild;
    document.querySelectorAll('.button-bar').forEach(bar => {
      siblingElement.parentNode.insertBefore(bar, siblingElement);
      if (optionHandler.getButtonBarTop()) {
        document.body.classList.add('button-bar-top');
      } else {
        document.body.classList.remove('button-bar-top');
      }
    });
  }
})();
