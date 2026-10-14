/**
 * Mythic Progression - Core Application Engine
 * Architecture: Vanilla JS + LocalStorage / Seed JSON
 * Roles: Client, Booster (Pro), Staff/Admin
 * Palette: Obsidian (#0c0907, #140f0c), Copper (#ee914f, #b85d1d), Parchment (#fcefc2)
 */

const COMPANY_MARGIN_PERCENT = 70;
const BOOSTER_DEFAULT_PERCENT = 30;
const BOOSTER_UPSELL_PERCENT = 50;
const BOOSTER_MAX_BID_PERCENT = 50;

class MythicApp {
  constructor() {
    this.currentUser = null;
    this.orders = [];
    this.services = [];
    this.boosters = [];
    this.clients = [];
    this.historyOrders = [];
    this.historyFiltered = [];
    this.historyCurrentPage = 1;
    this.historyPageSize = 25;
    this.historyFilterCartera = 'ALL';
    this.historyFilterMetodo = 'ALL';
    this.historyFilterEstado = 'ALL';
    this.historySearchTerm = '';
    this.cart = JSON.parse(localStorage.getItem('mp_cart')) || [];
    this.currentChatOrderId = null;
    this.currentActiveService = null;
    this.currentSelectedKeyPrice = 38.00;
    this.currentSelectedKeyLevel = 10;
    this.currentCalculatedModalTotal = 38.00;
    this.currentProduct = null;
    this.currentRunsQuantity = 1;
    this.currentUnitCalcPrice = 0;
    this.realms = [];
    this.currentRealmVersionFilter = 'ALL';
    this.selectedRealm = null;
    this.init();
  }

  cleanUrlBar() {
    try {
      if (typeof window === 'undefined' || !window.location) return;
      const loc = window.location;
      if (loc.protocol === 'file:') return;

      let pathname = loc.pathname;
      let needsClean = false;

      if (pathname.endsWith('/index.html')) {
        pathname = pathname.substring(0, pathname.length - 10) || '/';
        needsClean = true;
      } else if (pathname === '/index.html' || pathname === 'index.html') {
        pathname = '/';
        needsClean = true;
      } else if (pathname.endsWith('.html')) {
        pathname = pathname.substring(0, pathname.length - 5);
        needsClean = true;
      }

      if (needsClean) {
        const cleanUrl = (pathname || '/') + loc.search + loc.hash;
        window.history.replaceState(null, '', cleanUrl);
      }
    } catch (e) {
      console.debug('cleanUrlBar:', e);
    }
  }

  async init() {
    try { this.cleanupGoogleTranslate(); } catch (e) {}
    try { this.cleanUrlBar(); } catch (e) { console.warn('cleanUrlBar:', e); }
    try { this.initLanguage(); } catch (e) { console.warn('initLanguage:', e); }
    try { this.initLiveChatWidget(); } catch (e) { console.warn('initLiveChatWidget:', e); }
    try { this.initSession(); } catch (e) { console.warn('initSession pre-data:', e); }
    try { await this.loadInitialData(); } catch (e) { console.warn('loadInitialData:', e); }
    try { await this.checkDiscordOAuthCallback(); } catch (e) { console.warn('checkDiscordOAuthCallback:', e); }
    try { this.initSession(); } catch (e) { console.warn('initSession post-data:', e); }
    try { this.renderHeader(); } catch (e) { console.warn('renderHeader:', e); }
    try { this.setupLiveSearch(); } catch (e) { console.warn('setupLiveSearch:', e); }
    try { this.updateCartCounter(); } catch (e) { console.warn('updateCartCounter:', e); }
    try { this.renderLanguageSelector(); } catch (e) { console.warn('renderLanguageSelector:', e); }

    try {
      const path = (window.location && window.location.pathname) ? window.location.pathname.toLowerCase() : '';
      const cleanPath = path.replace(/\.html$/i, '').replace(/\/+$/, '') || '/';

      if (cleanPath.endsWith('/product') || cleanPath === 'product') {
        this.initSingleProductPage();
      } else if (cleanPath.endsWith('/client-profile') || cleanPath === 'client-profile') {
        this.initClientProfile();
      } else if (cleanPath.endsWith('/pro') || cleanPath === 'pro' || cleanPath.endsWith('/pro/index') || cleanPath === 'pro/index' || cleanPath.includes('/pro')) {
        this.initProPortal();
      } else if (cleanPath.endsWith('/admin') || cleanPath === 'admin' || cleanPath.endsWith('/admin/index') || cleanPath === 'admin/index' || cleanPath.includes('/admin')) {
        this.initAdminPortal();
      } else if (cleanPath.endsWith('/mplus') || cleanPath === 'mplus') {
        this.initCategoryPage('Míticas Plus');
      } else if (cleanPath.endsWith('/raids') || cleanPath === 'raids') {
        this.initCategoryPage('Bandas / Raids');
      } else if (cleanPath.endsWith('/leveling') || cleanPath === 'leveling') {
        this.initCategoryPage('Powerleveling');
      } else if (cleanPath.endsWith('/gearing') || cleanPath === 'gearing') {
        this.initCategoryPage('Equipo / ilvl');
      } else {
        this.initStoreFront();
      }
    } catch (e) {
      console.warn('Path router error, falling back to initStoreFront:', e);
      try { this.initStoreFront(); } catch (err) { console.error('initStoreFront fallback error:', err); }
    }
  }

  async loadInitialData() {
    // 1. Boosters
    try {
      const storedBoosters = localStorage.getItem('mp_boosters');
      if (storedBoosters && JSON.parse(storedBoosters).length > 0) {
        this.boosters = JSON.parse(storedBoosters);
      } else {
        const res = await fetch('data/seed_boosters.json');
        this.boosters = await res.json();
        this.saveBoosters();
      }
      // Normalize multi-roles across all boosters
      if (this.boosters && Array.isArray(this.boosters)) {
        this.boosters.forEach(b => {
          if (!b.roles || !Array.isArray(b.roles)) {
            b.roles = [b.role || 'Booster'];
          }
          if (b.discord_id === '443948776562884620' || (b.username && b.username.toLowerCase() === 'miguelb')) {
            if (!b.roles.includes('Master Booster')) b.roles.unshift('Master Booster');
            if (!b.roles.includes('Staff / Admin')) b.roles.push('Staff / Admin');
            b.role = 'Master Booster & Admin';
            b.isAdmin = true;
            b.isStaff = true;
            if (!b.avatar) {
              const backup = localStorage.getItem('mp_discord_avatar_backup');
              if (backup) b.avatar = backup;
            }
          }
          if (b.discord_id === '238855576992481280' || b.discord_id === '23885576992481280' || (b.username && b.username.toLowerCase() === 'mollys') || (b.email && b.email.toLowerCase() === 'jaiker.mencias@gmail.com')) {
            if (!b.roles.includes('Elite Booster')) b.roles.unshift('Elite Booster');
            if (!b.roles.includes('Staff / Admin')) b.roles.push('Staff / Admin');
            b.role = 'Elite Booster & Staff';
            b.isAdmin = true;
            b.isStaff = true;
          }
        });

        // Synchronize current logged-in user with their booster roles in memory
        if (this.currentUser) {
          const cDiscord = String(this.currentUser.discordId || this.currentUser.discord_id || '');
          const cEmail = (this.currentUser.email || '').toLowerCase();
          const cUser = (this.currentUser.username || '').toLowerCase();

          const matchedBooster = this.boosters.find(b => 
            (cDiscord && b.discord_id && (b.discord_id === cDiscord || String(b.discord_id).includes(cDiscord) || cDiscord.includes(String(b.discord_id)))) ||
            (cEmail && b.email && b.email.toLowerCase() === cEmail) ||
            (cUser && b.username && b.username.toLowerCase() === cUser)
          );

          if (matchedBooster) {
            const isStaffOrAdmin = (matchedBooster.roles && matchedBooster.roles.some(r => /admin|staff|gerente|soporte/i.test(r))) ||
              (matchedBooster.role && /admin|staff|gerente|soporte/i.test(matchedBooster.role)) ||
              matchedBooster.isAdmin === true || matchedBooster.isStaff === true;

            if (isStaffOrAdmin) {
              this.currentUser.isAdmin = true;
              this.currentUser.isStaff = true;
              this.currentUser.type = 'admin';
              this.currentUser.roles = matchedBooster.roles || ['Staff / Admin'];
              this.currentUser.role = matchedBooster.role || 'Staff / Admin';
              this.saveUser();
            }
          }
        }
      }
    } catch (e) {
      console.warn('Fallback loading boosters:', e);
      if (!this.boosters || this.boosters.length === 0) this.boosters = [];
    }

    // 2. Services
    try {
      const storedServices = localStorage.getItem('mp_services');
      const catalogVersion = localStorage.getItem('mp_catalog_v');
      let shouldReload = (catalogVersion !== '2.7.0' || !storedServices);
      if (storedServices) {
        try {
          const parsed = JSON.parse(storedServices);
          if (!parsed.find(s => s.id === 'the-venomous-abyss') || !parsed.find(s => s.id === 'delves-midnight')) {
            shouldReload = true;
          }
        } catch (e) {
          shouldReload = true;
        }
      }

      if (!shouldReload && storedServices) {
        this.services = JSON.parse(storedServices);
      } else {
        const res = await fetch('data/seed_services.json');
        this.services = await res.json();
        localStorage.setItem('mp_catalog_v', '2.7.0');
        this.saveServices();
      }
    } catch (e) {
      console.warn('Fallback loading services:', e);
      if (!this.services || this.services.length === 0) this.services = [];
    }

    // 3. Orders
    try {
      const storedOrders = localStorage.getItem('mp_orders');
      const ordersVersion = localStorage.getItem('mp_orders_v');
      if (storedOrders && JSON.parse(storedOrders).length > 0 && ordersVersion === MythicApp.ORDERS_VERSION) {
        this.orders = JSON.parse(storedOrders);
      } else {
        const res = await fetch('data/seed_orders.json');
        const seedOrders = await res.json();
        let customOrders = [];
        if (storedOrders) {
          try {
            const parsed = JSON.parse(storedOrders);
            customOrders = parsed.filter(o => o && o.id && !seedOrders.some(so => so.id === o.id));
          } catch (e) {}
        }
        this.orders = [...customOrders, ...seedOrders];
        this.saveOrders();
        localStorage.setItem('mp_orders_v', MythicApp.ORDERS_VERSION);
      }

      // Sanitize legacy "Soporte / Gerencia" labels and ensure valid numeric totalPrice across stored orders
      if (Array.isArray(this.orders)) {
        let ordersNeedSave = false;
        this.orders.forEach(o => {
          if (!o) return;

          // Repair any NaN or missing total prices
          let p = Number(o.totalPrice);
          if (isNaN(p) || p <= 0) {
            p = Number(o.price);
          }
          if (isNaN(p) || p <= 0) {
            p = 45.00;
            ordersNeedSave = true;
          }
          if (o.totalPrice !== p || o.price !== p) {
            o.totalPrice = Math.round(p * 100) / 100;
            o.price = o.totalPrice;
            ordersNeedSave = true;
          }

          // Ensure valid economics
          let cShare = Number(o.companyShare);
          if (isNaN(cShare) || cShare <= 0) {
            o.companyShare = Math.round(o.totalPrice * 0.70 * 100) / 100;
            ordersNeedSave = true;
          }
          let bPayout = Number(o.boosterPayout);
          if (isNaN(bPayout) || bPayout <= 0) {
            o.boosterPayout = Math.round(o.totalPrice * 0.30 * 100) / 100;
            ordersNeedSave = true;
          }
          let mBid = Number(o.maxBidAllowed);
          if (isNaN(mBid) || mBid <= 0) {
            o.maxBidAllowed = Math.round(o.totalPrice * 0.50 * 100) / 100;
            ordersNeedSave = true;
          }

          if (!o.characterName && o.character) {
            o.characterName = o.character;
            ordersNeedSave = true;
          }
          if (!o.realm && o.characterName && o.characterName.includes('-')) {
            o.realm = o.characterName.split('-')[1].trim();
            ordersNeedSave = true;
          }

          if (Array.isArray(o.chat)) {
            o.chat.forEach(msg => {
              if (msg && msg.author && /soporte\s*\/\s*gerencia/i.test(msg.author)) {
                if (/miguelb/i.test(msg.author) || msg.sender === 'admin') {
                  msg.author = msg.author.replace(/\(Soporte\s*\/\s*Gerencia\)/i, '(Admin)');
                  msg.sender = 'admin';
                } else {
                  msg.author = msg.author.replace(/\(Soporte\s*\/\s*Gerencia\)/i, '(Staff)');
                  msg.sender = 'staff';
                }
                ordersNeedSave = true;
              }
            });
          }
        });
        if (ordersNeedSave) this.saveOrders();
      }
    } catch (e) {
      console.warn('Fallback loading orders:', e);
      if (!this.orders || this.orders.length === 0) this.orders = [];
    }

    // 4. Clients
    try {
      const storedClients = localStorage.getItem('mp_clients');
      if (storedClients && JSON.parse(storedClients).length > 0) {
        this.clients = JSON.parse(storedClients);
      } else {
        const res = await fetch('data/seed_clients.json');
        this.clients = await res.json();
        this.saveClients();
      }
    } catch (e) {
      console.warn('Fallback loading clients:', e);
      if (!this.clients || this.clients.length === 0) this.clients = [];
    }

    // 5. Historical Orders (Google Sheets - 1,900 rows)
    try {
      const res = await fetch('data/history_orders.min.json');
      this.historyOrders = await res.json();
    } catch (e) {
      console.warn('Fallback loading history orders:', e);
      this.historyOrders = [];
    }

    // 6. WoW Realms (Retail, Classic & Forever)
    try {
      const res = await fetch('data/realms.json');
      if (res.ok) {
        this.realms = await res.json();
      }
    } catch (e) {
      console.warn('Fallback loading realms:', e);
    }
    if (!this.realms || this.realms.length === 0) {
      this.realms = this.getFallbackRealmsList();
    }

    // 7. Initialize Cloud Realtime Database (Firebase Firestore)
    this.initFirebase();
  }

  // Owner identity. Only granted when the Discord ID comes from a real OAuth handshake.
  static get OWNER_DISCORD_ID() { return '443948776562884620'; }
  static get SESSION_VERSION() { return '3'; }
  static get ORDERS_VERSION() { return '3.0.0'; }

  isVerifiedOwner(user = this.currentUser) {
    if (!user) return false;
    const id = String(user.discordId || user.discord_id || '').trim();
    return id === MythicApp.OWNER_DISCORD_ID && user.ownerVerified === true;
  }

  initSession() {
    // SECURITY: invalidate every session created before the identity fix.
    // Older builds could impersonate the owner (demo buttons, /pro auto-login, name matching).
    if (localStorage.getItem('mp_session_v') !== MythicApp.SESSION_VERSION) {
      localStorage.removeItem('mp_current_user');
      sessionStorage.removeItem('mp_current_user');
      localStorage.removeItem('mp_discord_avatar_backup');
      localStorage.setItem('mp_session_v', MythicApp.SESSION_VERSION);
    }

    const stored = localStorage.getItem('mp_current_user');
    if (stored) {
      try {
        this.currentUser = JSON.parse(stored);
        if (this.currentUser) {
          // Normalize multi-roles
          if (!this.currentUser.roles || !Array.isArray(this.currentUser.roles)) {
            this.currentUser.roles = [this.currentUser.role || (this.currentUser.type === 'admin' ? 'Staff / Admin' : 'Booster')];
          }
          // If session belongs to owner Discord ID, preserve owner flags
          if (String(this.currentUser.discordId || '') === MythicApp.OWNER_DISCORD_ID) {
            this.currentUser.ownerVerified = true;
            this.currentUser.isAdmin = true;
            this.currentUser.isBooster = true;
          } else if (this.currentUser.id === 'admin_miguelb' && !this.currentUser.ownerVerified) {
            // Drop unverified legacy mock sessions
            this.currentUser = null;
            localStorage.removeItem('mp_current_user');
            return;
          }

          // Restore avatar only from the booster record with the SAME Discord ID
          if (!this.currentUser.avatar && this.currentUser.discordId) {
            const bMatch = this.boosters && this.boosters.find(b => b.discord_id === this.currentUser.discordId);
            if (bMatch && bMatch.avatar) this.currentUser.avatar = bMatch.avatar;
          }
        }
      } catch (e) {
        this.currentUser = null;
        localStorage.removeItem('mp_current_user');
      }
    } else {
      this.currentUser = null;
    }
  }

  saveOrders() {
    localStorage.setItem('mp_orders', JSON.stringify(this.orders));
    if (this.db && Array.isArray(this.orders)) {
      this.orders.forEach(o => {
        if (o && o.id) {
          this.db.collection('orders').doc(o.id).set(o, { merge: true }).catch(e => console.warn('Firestore order save err:', e));
        }
      });
    }
  }

  async initFirebase() {
    try {
      if (typeof window === 'undefined') return;

      if (!window.firebase || !window.firebase.firestore) {
        await this.loadExternalScript('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
        await this.loadExternalScript('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js');
      }

      const firebaseConfig = {
        apiKey: "AIzaSyAGtX_PQcju6CW1-_kdRRu1CzphZhZJqi8",
        authDomain: "mythicprogression-a008b.firebaseapp.com",
        projectId: "mythicprogression-a008b",
        storageBucket: "mythicprogression-a008b.firebasestorage.app",
        messagingSenderId: "726140596173",
        appId: "1:726140596173:web:08889da65791925b011a84",
        measurementId: "G-SWFH4KLEB1"
      };

      if (!window.firebase.apps || !window.firebase.apps.length) {
        window.firebase.initializeApp(firebaseConfig);
      }
      this.db = window.firebase.firestore();
      console.log('🔥 [Firebase Firestore] Conectado exitosamente en tiempo real a mythicprogression-a008b');

      this.initFirestoreRealtimeSync();
    } catch (err) {
      console.warn('Firebase init notice:', err);
    }
  }

  loadExternalScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  initFirestoreRealtimeSync() {
    if (!this.db) return;

    // 1. Escuchar cambios de Órdenes en tiempo real (Colección 'orders')
    this.db.collection('orders').onSnapshot((snapshot) => {
      if (snapshot.empty) {
        this.seedFirestoreInitialOrders();
        return;
      }

      const remoteOrders = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data && data.id) remoteOrders.push(data);
      });

      if (remoteOrders.length > 0) {
        remoteOrders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        this.orders = remoteOrders;
        localStorage.setItem('mp_orders', JSON.stringify(remoteOrders));

        if (typeof this.renderProOrderFeed === 'function') this.renderProOrderFeed();
        if (typeof this.renderProMyOrders === 'function') this.renderProMyOrders();
        if (typeof this.renderAdminOverview === 'function') this.renderAdminOverview();
        if (typeof this.renderAdminOrders === 'function') this.renderAdminOrders(this.currentAdminOrderStatusFilter || 'ALL');
        if (typeof this.renderChatList === 'function') this.renderChatList();
        if (typeof this.renderClientOrders === 'function') this.renderClientOrders();

        if (this.activeChatOrderId && this.activeChatOrderId !== 'live_support') {
          this.openChat(this.activeChatOrderId);
        }
      }
    }, (error) => {
      console.warn('Firestore orders sync notice:', error);
    });

    // 2. Escuchar mensajes de Soporte en Vivo Web (Colección 'live_support')
    this.db.collection('live_support').doc('global_chat').onSnapshot((doc) => {
      if (doc.exists) {
        const data = doc.data();
        if (Array.isArray(data.messages) && data.messages.length > 0) {
          this.liveChatMessages = data.messages;
          localStorage.setItem('mp_live_support_chat', JSON.stringify(data.messages));
          this.renderLiveChatMessages();
          if (typeof this.renderChatList === 'function') this.renderChatList();
          if (this.activeChatOrderId === 'live_support' && typeof this.openAdminLiveSupportChat === 'function') {
            this.openAdminLiveSupportChat();
          }
        }
      }
    }, (error) => {
      console.warn('Firestore live support sync notice:', error);
    });

    // 3. Escuchar roles de Staff y Permisos de Admin en tiempo real (Colección 'system' -> 'staff_roles')
    this.db.collection('system').doc('staff_roles').onSnapshot((doc) => {
      if (doc.exists) {
        const data = doc.data();
        if (data && Array.isArray(data.staff)) {
          let updatedAny = false;
          data.staff.forEach(s => {
            const b = (this.boosters || []).find(x => 
              (x.discord_id && s.discord_id && String(x.discord_id) === String(s.discord_id)) ||
              (x.username && s.username && x.username.toLowerCase() === s.username.toLowerCase()) ||
              (x.email && s.email && x.email.toLowerCase() === s.email.toLowerCase())
            );
            if (b) {
              b.role = s.role || 'Staff / Admin';
              b.roles = s.roles || ['Booster', 'Staff / Admin'];
              b.isAdmin = true;
              b.isStaff = true;
              updatedAny = true;
            }
            // Elevate privileges instantly for currently logged-in user if they are staff!
            if (this.currentUser && (
              (this.currentUser.discordId && s.discord_id && (String(this.currentUser.discordId) === String(s.discord_id) || String(this.currentUser.discordId).includes(String(s.discord_id)) || String(s.discord_id).includes(String(this.currentUser.discordId)))) ||
              (this.currentUser.username && s.username && this.currentUser.username.toLowerCase() === s.username.toLowerCase()) ||
              (this.currentUser.email && s.email && this.currentUser.email.toLowerCase() === s.email.toLowerCase()) ||
              (this.currentUser.username && this.currentUser.username.toLowerCase() === 'mollys') ||
              (this.currentUser.email && this.currentUser.email.toLowerCase() === 'jaiker.mencias@gmail.com')
            )) {
              this.currentUser.isAdmin = true;
              this.currentUser.isStaff = true;
              this.currentUser.type = 'admin';
              this.currentUser.role = s.role || 'Staff / Admin';
              this.currentUser.roles = s.roles || ['Booster', 'Staff / Admin'];
              this.saveUser();
              this.renderHeader();
              const adminLink = document.getElementById('pro-sidebar-admin-link');
              if (adminLink) adminLink.classList.remove('hidden');
              const headerAdminBtn = document.getElementById('header-admin-btn');
              if (headerAdminBtn) headerAdminBtn.classList.remove('hidden');
              if (typeof this.renderChatList === 'function') this.renderChatList();
            }
          });
          if (updatedAny) {
            localStorage.setItem('mp_boosters', JSON.stringify(this.boosters));
            if (typeof this.renderAdminBoosters === 'function') this.renderAdminBoosters();
          }
        }
      }
    }, (error) => {
      console.warn('Firestore staff_roles sync notice:', error);
    });

    // 4. Escuchar lista de boosters completa en tiempo real
    this.db.collection('system').doc('boosters_list').onSnapshot((doc) => {
      if (doc.exists) {
        const data = doc.data();
        if (data && Array.isArray(data.boosters) && data.boosters.length > 0) {
          this.boosters = data.boosters;
          localStorage.setItem('mp_boosters', JSON.stringify(data.boosters));
          if (typeof this.renderAdminBoosters === 'function') this.renderAdminBoosters();
        }
      }
    }, (error) => {
      console.warn('Firestore boosters_list sync notice:', error);
    });
  }

  seedFirestoreInitialOrders() {
    if (!this.db || !Array.isArray(this.orders) || this.orders.length === 0) return;
    this.orders.forEach(o => {
      if (o && o.id) {
        this.db.collection('orders').doc(o.id).set(o).catch(e => console.warn('Seed order error:', e));
      }
    });
  }

  syncLiveSupportToCloud() {
    if (this.db) {
      this.db.collection('live_support').doc('global_chat').set({
        messages: this.liveChatMessages || [],
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(err => console.warn('Firestore live chat sync error:', err));
    }
  }

  saveServices() {
    localStorage.setItem('mp_services', JSON.stringify(this.services));
  }

  saveBoosters() {
    localStorage.setItem('mp_boosters', JSON.stringify(this.boosters));
    if (this.db && Array.isArray(this.boosters)) {
      const staffList = this.boosters.filter(b => 
        (b.roles && b.roles.some(r => /admin|staff|gerente|soporte/i.test(r))) ||
        (b.role && /admin|staff|gerente|soporte/i.test(b.role)) ||
        b.isAdmin === true ||
        b.isStaff === true
      );
      this.db.collection('system').doc('staff_roles').set({
        staff: staffList.map(b => ({
          discord_id: b.discord_id || '',
          username: b.username || '',
          email: (b.email || '').toLowerCase(),
          role: b.role || 'Staff / Admin',
          roles: b.roles || ['Staff / Admin'],
          isAdmin: true,
          isStaff: true
        })),
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(err => console.warn('Firestore staff_roles save error:', err));

      this.db.collection('system').doc('boosters_list').set({
        boosters: this.boosters,
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(err => console.warn('Firestore boosters_list save error:', err));
    }
  }

  saveClients() {
    localStorage.setItem('mp_clients', JSON.stringify(this.clients));
  }

  saveUser() {
    localStorage.setItem('mp_current_user', JSON.stringify(this.currentUser));
  }

  saveCart() {
    localStorage.setItem('mp_cart', JSON.stringify(this.cart));
    this.updateCartCounter();
  }

  // ==========================================
  // ECONOMICS & CALCULATIONS
  // ==========================================
  calculateEconomics(totalPrice, isUpsell = false) {
    const price = Number(totalPrice) || 0;
    if (isUpsell) {
      const share = price * 0.50;
      return {
        company: share,
        booster: share,
        boosterRate: 50,
        maxBid: share
      };
    }
    const company = price * 0.70;
    const booster = price * 0.30;
    const maxBid = price * 0.50;
    return {
      company: company,
      booster: booster,
      boosterRate: 30,
      maxBid: maxBid
    };
  }

  // ==========================================
  // PERMISSIONS & QUICK ACTIONS
  // ==========================================
  checkBoosterPermission() {
    if (!this.currentUser) {
      this.showToast('Debes identificarte como Booster para ofertar o tomar órdenes.', 'error');
      return false;
    }
    if (this.currentUser.type !== 'booster' && this.currentUser.type !== 'admin') {
      this.showToast('Acceso exclusivo para Boosters autorizados.', 'error');
      return false;
    }
    return true;
  }

  checkAdminPermission() {
    if (!this.currentUser) {
      this.showToast('Debes iniciar sesión con una cuenta de Administrador o Staff.', 'error');
      return false;
    }
    if (!this.isAdminOrGerente() && !this.isAdmin()) {
      this.showToast('Acceso exclusivo para Administradores y Staff.', 'error');
      return false;
    }
    return true;
  }

  addServiceQuickToCart(serviceId) {
    const svc = this.services.find(s => s.id === serviceId) || this.services[0];
    if (!svc) return;

    const item = {
      cartId: 'item_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      serviceId: svc.id,
      serviceName: svc.name,
      category: svc.category,
      unitPrice: Number(svc.basePrice),
      quantity: 1,
      totalPrice: Number(svc.basePrice),
      character: this.currentUser?.battletag || 'MiPersonaje-Ragnaros',
      mode: 'Self-Play',
      region: 'US',
      details: 'Self-Play | US | Configuración Estándar',
      referredBooster: sessionStorage.getItem('mp_upsell_booster') || null
    };

    this.addToCart(item, true);
    this.showToast(`¡${svc.name} añadido al carrito!`, 'success');
  }

  canAccessOrderChat(order, user) {
    if (!order || !user) return false;
    if (user.type === 'admin' || user.type === 'staff') return true;
    if (user.type === 'client' && order.clientId === user.id) return true;
    if (user.type === 'booster' && order.assignedBooster && order.assignedBooster.id === user.id) return true;
    return false;
  }

// AUTH (CLIENT VS BOOSTER VS ADMIN)
  // ==========================================
  // UNVERIFIED login (manual ID / demo). It can NEVER grant owner, admin, staff or booster
  // privileges, because anyone can type someone else's Discord ID or name.
  authenticateWithDiscord(discordId, customName = null) {
    const id = String(discordId || '').trim();
    const name = (customName || ('Cliente_' + id.slice(0, 4))).trim();
    this.currentUser = {
      id: 'client_' + (id || ('u' + Date.now())),
      type: 'client',
      username: name,
      role: 'Cliente',
      roles: ['Cliente'],
      email: '',
      country: 'Global',
      discordId: id,
      balance: 0.00,
      isAdmin: false,
      isBooster: false
    };
    this.saveUser();
    this.showToast(`¡Bienvenido ${this.currentUser.username}!`, 'success');
    this.renderHeader();
    return { status: 'CLIENT_LOGGED_IN', user: this.currentUser };
  }

  // Only called after a VERIFIED Discord OAuth handshake whose ID equals OWNER_DISCORD_ID.
  authenticateAsAdmin(verifiedPayload) {
    if (!verifiedPayload || String(verifiedPayload.id) !== MythicApp.OWNER_DISCORD_ID) {
      console.warn('authenticateAsAdmin rejected: not a verified owner payload');
      return { status: 'REJECTED' };
    }
    const ownerRecord = (this.boosters || []).find(b => b.discord_id === MythicApp.OWNER_DISCORD_ID) || {};
    this.currentUser = {
      id: 'booster_' + MythicApp.OWNER_DISCORD_ID,
      type: 'admin',
      username: verifiedPayload.username || ownerRecord.username || 'Owner',
      role: 'Master Booster & Admin',
      roles: ['Master Booster', 'Staff / Admin'],
      email: verifiedPayload.email || ownerRecord.email || '',
      country: 'Global',
      discordId: MythicApp.OWNER_DISCORD_ID,
      discordTag: verifiedPayload.discordTag || '',
      discordConnected: true,
      avatar: verifiedPayload.avatar || ownerRecord.avatar || '',
      points: ownerRecord.points || 0,
      approved: true,
      balance: ownerRecord.balance || 0.00,
      payoutMethod: ownerRecord.payout_method || '',
      isAdmin: true,
      isBooster: true,
      ownerVerified: true
    };
    if (ownerRecord && verifiedPayload.avatar) {
      ownerRecord.avatar = verifiedPayload.avatar;
      this.saveBoosters();
    }
    this.saveUser();
    this.renderHeader();
    this.showToast(`¡Sesión iniciada como Administrador (${this.currentUser.username})!`, 'success');
    return { status: 'ADMIN_LOGGED_IN', user: this.currentUser };
  }

  // "Ver como Staff" quick switch: only navigates, never changes identity.
  loginAsAdminQuick() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.add('hidden');
    if (this.isAdminOrGerente()) window.location.href = 'admin';
    else this.showToast('Acceso exclusivo para Administradores.', 'error');
  }

  // ==========================================
  // DISCORD OAUTH2 & BOT AUTHENTICATION
  // ==========================================
  getOAuthRedirectUri() {
    if (!window.location.origin || window.location.origin === 'null' || window.location.protocol === 'file:') {
      return 'http://localhost:8080/index.html';
    }
    const host = window.location.hostname.toLowerCase();
    if (host.includes('mythicprogression.com')) {
      const proto = window.location.protocol === 'http:' ? 'http:' : 'https:';
      return `${proto}//www.mythicprogression.com/index.html`;
    }
    if (host.includes('github.io')) {
      const pathname = window.location.pathname;
      const repo = pathname.split('/')[1] || '';
      return repo ? `${window.location.origin}/${repo}/index.html` : `${window.location.origin}/index.html`;
    }
    return `${window.location.origin}/index.html`;
  }

  loginWithDiscordOAuth() {
    const clientId = '861673053363896320'; // Mythic Progression Official Client ID
    const redirectUri = this.getOAuthRedirectUri();

    sessionStorage.setItem('mp_oauth_return_url', window.location.href);
    sessionStorage.setItem('mp_discord_oauth_active', '1');

    const scope = encodeURIComponent('identify email');
    const oauthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&response_type=token&scope=${scope}&redirect_uri=${encodeURIComponent(redirectUri)}`;

    window.location.href = oauthUrl;
  }

  async checkDiscordOAuthCallback() {
    const hash = window.location.hash || '';
    if (hash.includes('access_token=')) {
      const params = new URLSearchParams(hash.replace('#', '?'));
      const token = params.get('access_token');
      if (token) {
        await this.fetchDiscordUserProfile(token);
      }
    }
  }

  async fetchDiscordUserProfile(token) {
    try {
      this.showToast('Conectando y sincronizando con Discord...', 'info');
      const res = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error al consultar perfil de Discord: ' + res.status);
      const data = await res.json();
      
      let avatarUrl = '';
      if (data.avatar) {
        const ext = data.avatar.startsWith('a_') ? 'gif' : 'png';
        avatarUrl = `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.${ext}?size=256`;
      } else {
        const defaultIndex = (data.discriminator === '0' || !data.discriminator)
          ? Number((BigInt(data.id) >> 22n) % 6n)
          : (Number(data.discriminator) % 5);
        avatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
      }
        
      this.handleDiscordUserPayload({
        id: data.id,
        username: data.global_name || data.username,
        email: data.email,
        avatar: avatarUrl,
        discordTag: `${data.username}#${data.discriminator || '0'}`
      });

      try {
        history.replaceState(null, null, window.location.pathname);
        this.cleanUrlBar();
      } catch (e) {}
    } catch (err) {
      console.error('Discord OAuth error:', err);
      this.showToast('No se pudo completar el handshake con Discord. Puedes ingresar tu Discord ID manualmente.', 'error');
    }
  }

  syncDiscordAvatar() {
    this.showToast('Conectando con Discord para sincronizar tu foto oficial...', 'info');
    sessionStorage.setItem('mp_oauth_return_url', window.location.href);
    this.loginWithDiscordOAuth();
  }

  handleDiscordUserPayload(payload) {
    const discordId = String(payload.id).trim();
    const username = payload.username || ('User_' + discordId.slice(0, 4));
    const avatar = payload.avatar || '';

    if (avatar) {
      localStorage.setItem('mp_discord_avatar_backup', avatar);
    }

    // CHECK IF LINKING TO EXISTING ACCOUNT (e.g. Google user linking Discord)
    const isLinkingMode = sessionStorage.getItem('mp_link_account_mode') === 'discord';
    if (isLinkingMode && this.currentUser) {
      sessionStorage.removeItem('mp_link_account_mode');
      this.currentUser.discordId = discordId;
      this.currentUser.discordTag = payload.discordTag || username;
      this.currentUser.discordConnected = true;
      if (avatar && !this.currentUser.avatar) this.currentUser.avatar = avatar;

      const existingBooster = this.boosters ? this.boosters.find(b => 
        b.discord_id === discordId
      ) : null;

      if (discordId === MythicApp.OWNER_DISCORD_ID) {
        this.currentUser.isAdmin = true;
        this.currentUser.isBooster = true;
        this.currentUser.type = 'admin';
        this.currentUser.role = 'Master Booster & Admin';
        this.currentUser.roles = ['Master Booster', 'Staff / Admin'];
      } else if (existingBooster) {
        const isStaffOrAdmin = (existingBooster.roles && existingBooster.roles.some(r => /admin|staff|gerente/i.test(r))) ||
          (existingBooster.role && /admin|staff|gerente/i.test(existingBooster.role));
        this.currentUser.isBooster = true;
        this.currentUser.isStaff = isStaffOrAdmin;
        this.currentUser.role = existingBooster.role || (isStaffOrAdmin ? 'Staff / Admin' : 'Booster');
        this.currentUser.roles = existingBooster.roles || [this.currentUser.role];
        this.currentUser.points = existingBooster.points || 0;
        this.currentUser.balance = existingBooster.balance || 0.00;
        if (isStaffOrAdmin) {
          this.currentUser.type = 'staff';
        }
      }

      this.saveUser();
      this.showToast(`¡Tu cuenta de Discord (${this.currentUser.discordTag}) fue vinculada exitosamente con tu cuenta de Google!`, 'success');
      this.renderHeader();
      const returnUrl = sessionStorage.getItem('mp_oauth_return_url');
      sessionStorage.removeItem('mp_oauth_return_url');
      window.location.href = returnUrl || (this.currentUser.isAdmin ? 'admin' : (this.currentUser.isBooster ? 'pro' : 'client-profile'));
      return;
    }

    // 1. Check if verified Owner (Miguelb) by verified Discord ID ONLY
    if (discordId === MythicApp.OWNER_DISCORD_ID) {
      const adminRes = this.authenticateAsAdmin(payload);
      const returnUrl = sessionStorage.getItem('mp_oauth_return_url');
      sessionStorage.removeItem('mp_oauth_return_url');
      if (returnUrl && (returnUrl.includes('pro') || returnUrl.includes('client-profile'))) {
        window.location.href = returnUrl;
      } else {
        window.location.href = 'admin';
      }
      return adminRes;
    }

    // 2. Check if Booster in database
    const existingBooster = this.boosters ? this.boosters.find(b => 
      b.discord_id === discordId || 
      (b.email && payload.email && b.email.toLowerCase() === payload.email.toLowerCase()) ||
      (b.username && payload.username && b.username.toLowerCase() === payload.username.toLowerCase())
    ) : null;

    if (existingBooster) {
      if (payload.username && existingBooster.username !== payload.username) {
        existingBooster.username = payload.username;
      }
      if (discordId && !existingBooster.discord_id) {
        existingBooster.discord_id = discordId;
      }
      this.saveBoosters();

      const isStaffOrAdmin = (existingBooster.roles && existingBooster.roles.some(r => /admin|staff|gerente|soporte/i.test(r))) ||
        (existingBooster.role && /admin|staff|gerente|soporte/i.test(existingBooster.role)) ||
        existingBooster.isAdmin === true ||
        existingBooster.isStaff === true;

      const bRoles = Array.isArray(existingBooster.roles) ? [...existingBooster.roles] : [existingBooster.role || 'Booster'];
      if (isStaffOrAdmin && !bRoles.some(r => /admin|staff/i.test(r))) {
        bRoles.push('Staff / Admin');
      }

      this.currentUser = {
        id: 'booster_' + (existingBooster.discord_id || discordId),
        type: isStaffOrAdmin ? 'admin' : 'booster',
        discordId: existingBooster.discord_id || discordId,
        discordTag: payload.discordTag || `${username}#0`,
        discordConnected: true,
        username: payload.username || existingBooster.username,
        role: existingBooster.role || (isStaffOrAdmin ? 'Staff / Admin' : 'Booster'),
        roles: bRoles,
        points: existingBooster.points || 0,
        approved: existingBooster.approved !== false,
        balance: existingBooster.balance || 0.00,
        email: payload.email || existingBooster.email || '',
        avatar: payload.avatar || existingBooster.avatar || '',
        payoutMethod: existingBooster.payout_method || existingBooster.payoutMethod || 'Binance Pay / USDT',
        payoutAddress: existingBooster.wallet_id || existingBooster.payout_address || '',
        wallet_id: existingBooster.wallet_id || '',
        isAdmin: isStaffOrAdmin,
        isStaff: isStaffOrAdmin,
        isBooster: true
      };
      this.saveUser();
      this.showToast(`¡Conectado como Booster ${this.currentUser.username}!`, 'success');
      this.renderHeader();
      const returnUrl = sessionStorage.getItem('mp_oauth_return_url');
      sessionStorage.removeItem('mp_oauth_return_url');
      window.location.href = returnUrl || (isStaffOrAdmin ? 'admin' : 'pro');
      return { status: isStaffOrAdmin ? 'STAFF_LOGGED_IN' : 'BOOSTER_LOGGED_IN', user: this.currentUser };
    }

    // 3. Otherwise Client
    this.currentUser = {
      id: 'client_' + discordId,
      type: 'client',
      username: username,
      role: 'Cliente',
      roles: ['Cliente'],
      email: payload.email || `${username.toLowerCase()}@discord.com`,
      country: 'Global',
      discordId: discordId,
      discordTag: payload.discordTag || `${username}#0`,
      discordConnected: true,
      avatar: payload.avatar || '',
      balance: 0.00,
      isAdmin: false,
      isBooster: false
    };
    this.saveUser();
    this.showToast(`¡Bienvenido ${username}! Conectado con Discord.`, 'success');
    this.renderHeader();
    window.location.href = 'client-profile';
    return { status: 'CLIENT_LOGGED_IN', user: this.currentUser };
  }

  openAuthModal() {
    let modal = document.getElementById('auth-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'auth-modal';
      modal.className = 'fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4';
      document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
      <div class="glass-panel rounded-3xl w-full max-w-md p-6 sm:p-7 border border-[#ee914f]/30 shadow-2xl relative overflow-hidden bg-[#120d09]">
        <!-- Top accent banner -->
        <div class="absolute -top-16 -right-16 w-36 h-36 rounded-full bg-[#ee914f]/15 blur-2xl pointer-events-none"></div>

        <!-- Header -->
        <div class="flex items-center justify-between pb-4 border-b border-stone-800">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-[#241a12] border border-[#ee914f]/40 flex items-center justify-center text-[#ee914f] shadow-md">
              <i class="fa-solid fa-shield-halved text-base"></i>
            </div>
            <div>
              <h3 class="text-base font-bold text-white font-cinzel leading-tight">Iniciar Sesión</h3>
              <span class="text-[10px] text-stone-400">Acceso Seguro a Mythic Progression</span>
            </div>
          </div>
          <button onclick="app.closeAuthModal()" class="w-8 h-8 rounded-full bg-stone-900 text-stone-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="py-4 space-y-4">
          <!-- Bot Telemetry Badge -->
          <div class="bg-[#141226] p-3 rounded-2xl border border-[#5865F2]/30 flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-[#201c3d] flex items-center justify-center text-[#5865F2] shrink-0 border border-[#5865F2]/30">
              <i class="fa-brands fa-discord text-sm"></i>
            </div>
            <div class="text-xs flex-1">
              <div class="font-bold text-[#fcefc2] flex items-center justify-between">
                <span>Mythic Progression Bot Oficial</span>
                <span class="inline-flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
                  <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  En Línea
                </span>
              </div>
              <div class="text-[10px] text-stone-400">Verificación Oficial • Conexión Cifrada OAuth2</div>
            </div>
          </div>

          <!-- OPTION 1: DISCORD OAUTH BUTTON -->
          <div>
            <button onclick="app.loginWithDiscordOAuth()" class="w-full py-3.5 px-4 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-lg shadow-[#5865F2]/30 transition-all hover:scale-[1.01] active:scale-[0.99] group cursor-pointer">
              <i class="fa-brands fa-discord text-xl group-hover:scale-110 transition-transform"></i>
              <span>Iniciar Sesión con Discord</span>
            </button>
            <span class="text-[10px] text-stone-500 text-center block mt-1.5">Conexión OAuth2 segura. Reconoce automáticamente tu rango oficial y roles.</span>
          </div>

          <!-- SEPARATOR -->
          <div class="flex items-center gap-3 my-1">
            <div class="h-px bg-stone-800 flex-1"></div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-stone-500">O también puedes</span>
            <div class="h-px bg-stone-800 flex-1"></div>
          </div>

          <!-- OPTION 2: GOOGLE SIGN-IN BUTTON (100% FREE & UNIFIED) -->
          <div>
            <button onclick="app.loginWithGoogle()" class="w-full py-3.5 px-4 rounded-xl bg-[#1c1611] hover:bg-[#281f18] text-white border border-stone-700 hover:border-[#ee914f]/60 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-3 shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] group cursor-pointer">
              <svg class="w-4 h-4 shrink-0 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Continuar con Google</span>
            </button>
            <span class="text-[10px] text-stone-500 text-center block mt-1.5">Acceso instantáneo con tu correo de Google (Gmail / Workspace).</span>
          </div>

          <!-- UNIFIED ACCOUNT CALLOUT -->
          <div class="bg-[#18110b] p-3 rounded-2xl border border-stone-800 text-[11px] text-stone-400 flex items-start gap-2.5">
            <i class="fa-solid fa-link text-[#ee914f] text-sm mt-0.5 shrink-0"></i>
            <div class="leading-relaxed">
              <strong class="text-[#fcefc2]">Cuentas Unificadas:</strong> Puedes acceder con Discord o Google. Si utilizas ambas, se vincularán bajo tu mismo perfil sin duplicar pedidos ni saldo.
            </div>
          </div>

          <!-- Quick switch ONLY if already authenticated as Admin/Gerente -->
          ${this.isAdminOrGerente() ? `
          <div class="pt-3 border-t border-stone-800 space-y-2">
            <span class="text-[10px] font-bold uppercase tracking-wider text-[#ee914f] block">Cambio rápido de vista (Modo Staff/Admin):</span>
            <div class="grid grid-cols-2 gap-2">
              <button onclick="app.loginAsDemoBooster()" class="py-2 px-3 rounded-xl bg-[#1d1610] hover:bg-[#2c2016] border border-[#ee914f]/30 text-xs font-semibold text-stone-300 hover:text-white flex items-center justify-center gap-1.5 transition-all text-left cursor-pointer">
                <i class="fa-solid fa-bolt text-[#ee914f] text-xs"></i>
                <span class="truncate">Ver como Pro</span>
              </button>
              <button onclick="app.loginAsAdminQuick()" class="py-2 px-3 rounded-xl bg-[#20140c] hover:bg-[#301c10] border border-[#ee914f]/40 text-xs font-semibold text-[#fcefc2] hover:text-white flex items-center justify-center gap-1.5 transition-all text-left cursor-pointer">
                <i class="fa-solid fa-shield-halved text-[#ee914f] text-xs"></i>
                <span class="truncate">Ver como Staff</span>
              </button>
            </div>
          </div>
          ` : ''}
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  loginWithGoogle() {
    this.closeAuthModal();
    this.openGoogleLoginModal(false);
  }

  linkGoogleAccount() {
    sessionStorage.setItem('mp_link_account_mode', 'google');
    this.openGoogleLoginModal(true);
  }

  linkDiscordAccount() {
    sessionStorage.setItem('mp_link_account_mode', 'discord');
    sessionStorage.setItem('mp_oauth_return_url', window.location.href);
    this.showToast('Redirigiendo a Discord para vincular tu cuenta oficial...', 'info');
    this.loginWithDiscordOAuth();
  }

  openGoogleLoginModal(isLinking = false) {
    let modal = document.getElementById('google-auth-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'google-auth-modal';
      modal.className = 'fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4';
      document.body.appendChild(modal);
    }

    const defaultEmail = (this.currentUser && this.currentUser.email) ? this.currentUser.email : '';

    modal.innerHTML = `
      <div class="glass-panel rounded-3xl w-full max-w-md p-6 sm:p-7 border border-[#4285F4]/40 shadow-2xl relative overflow-hidden bg-[#120d09]">
        <!-- Top accent -->
        <div class="absolute -top-16 -right-16 w-36 h-36 rounded-full bg-[#4285F4]/15 blur-2xl pointer-events-none"></div>

        <!-- Header -->
        <div class="flex items-center justify-between pb-4 border-b border-stone-800">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-md shrink-0">
              <svg class="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
            </div>
            <div>
              <h3 class="text-base font-bold text-white font-cinzel leading-tight">${isLinking ? 'Vincular Cuenta de Google' : 'Acceso con Google'}</h3>
              <span class="text-[10px] text-stone-400">Google Identity • 100% Gratuito y Seguro</span>
            </div>
          </div>
          <button onclick="document.getElementById('google-auth-modal').classList.add('hidden')" class="w-8 h-8 rounded-full bg-stone-900 text-stone-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form onsubmit="event.preventDefault(); app.submitGoogleAuthForm();" class="py-4 space-y-4">
          <!-- Quick One-Click Google Account -->
          <div class="bg-[#18110b] p-3 rounded-2xl border border-stone-800 hover:border-[#4285F4]/50 transition-colors cursor-pointer group" onclick="app.quickGoogleLogin('${defaultEmail}')">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-md">
                  ${defaultEmail[0].toUpperCase()}
                </div>
                <div>
                  <div class="text-xs font-bold text-white group-hover:text-[#fcefc2]">${defaultEmail}</div>
                  <span class="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                    <i class="fa-solid fa-check text-[9px]"></i> Cuenta rápida detectada
                  </span>
                </div>
              </div>
              <span class="px-2.5 py-1 rounded-lg bg-[#251b14] text-[10px] font-bold text-[#ee914f] border border-[#ee914f]/30">Continuar</span>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <div class="h-px bg-stone-800 flex-1"></div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-stone-500">O ingresa otra cuenta de Google</span>
            <div class="h-px bg-stone-800 flex-1"></div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-stone-300 mb-1">Correo de Google (Gmail / Workspace):</label>
            <input id="input-google-email" type="email" placeholder="tu-correo@gmail.com" class="w-full bg-[#16110c] border border-stone-700 rounded-xl px-4 py-2.5 text-xs text-white focus:border-[#4285F4] outline-none" required>
          </div>

          <div>
            <label class="block text-xs font-semibold text-stone-300 mb-1">Nombre o Alias:</label>
            <input id="input-google-name" type="text" placeholder="Ej: Carlos o Tu Nombre" class="w-full bg-[#16110c] border border-stone-700 rounded-xl px-4 py-2.5 text-xs text-white focus:border-[#4285F4] outline-none">
          </div>

          <div class="pt-2">
            <button type="submit" class="w-full py-3 px-4 rounded-xl bg-white hover:bg-stone-200 text-stone-900 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer">
              <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>${isLinking ? 'Vincular esta Cuenta de Google' : 'Acceder con Google'}</span>
            </button>
          </div>
        </form>
      </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  quickGoogleLogin(email) {
    const modal = document.getElementById('google-auth-modal');
    if (modal) modal.classList.add('hidden');
    const name = email.split('@')[0];
    this.handleGoogleUserPayload({
      email: email,
      name: name,
      avatar: '',
      googleId: 'g_' + Math.abs(this.hashCode(email))
    });
  }

  submitGoogleAuthForm() {
    const email = document.getElementById('input-google-email')?.value.trim();
    const name = document.getElementById('input-google-name')?.value.trim() || (email ? email.split('@')[0] : 'User');
    if (!email) return;
    const modal = document.getElementById('google-auth-modal');
    if (modal) modal.classList.add('hidden');
    this.handleGoogleUserPayload({
      email: email,
      name: name,
      avatar: '',
      googleId: 'g_' + Math.abs(this.hashCode(email))
    });
  }

  handleGoogleUserPayload(payload) {
    const email = (payload.email || '').trim().toLowerCase();
    const name = payload.name || email.split('@')[0];
    const googleId = payload.googleId || ('g_' + Date.now());
    const avatar = payload.avatar || '';

    // Check if in linking mode (current user logged in via Discord linking Google)
    const isLinkingMode = sessionStorage.getItem('mp_link_account_mode') === 'google';
    if (isLinkingMode && this.currentUser) {
      sessionStorage.removeItem('mp_link_account_mode');
      this.currentUser.googleEmail = email;
      this.currentUser.googleId = googleId;
      this.currentUser.googleConnected = true;
      if (!this.currentUser.email) this.currentUser.email = email;
      this.saveUser();
      this.showToast(`¡Cuenta de Google (${email}) vinculada exitosamente a tu perfil!`, 'success');
      this.renderHeader();
      if (window.location.pathname.includes('client-profile') || window.location.pathname.includes('pro')) {
        setTimeout(() => location.reload(), 300);
      }
      return;
    }

    // 1. Check if email belongs to Owner (Miguelb / charquin50@gmail.com)
    if (email === 'charquin50@gmail.com') {
      const adminRes = this.authenticateAsAdmin({
        id: MythicApp.OWNER_DISCORD_ID,
        username: 'Miguelb',
        email: email,
        avatar: avatar,
        discordTag: 'Miguelb#0'
      });
      this.currentUser.googleEmail = email;
      this.currentUser.googleId = googleId;
      this.currentUser.googleConnected = true;
      this.currentUser.discordId = MythicApp.OWNER_DISCORD_ID;
      this.currentUser.discordTag = 'Miguelb#0';
      this.currentUser.discordConnected = true;
      this.currentUser.email = email;
      if (avatar) this.currentUser.avatar = avatar;
      this.saveUser();
      this.showToast(`¡Bienvenido Miguelb! Conectado con Google (${email}) como Master Booster & Admin.`, 'success');
      this.renderHeader();
      window.location.href = 'admin';
      return adminRes;
    }

    // 2. Check if email matches existing booster
    const matchedBooster = this.boosters ? this.boosters.find(b => b.email && b.email.toLowerCase() === email) : null;
    if (matchedBooster) {
      const isStaffOrAdmin = (matchedBooster.roles && matchedBooster.roles.some(r => /admin|staff|gerente/i.test(r))) ||
        (matchedBooster.role && /admin|staff|gerente/i.test(matchedBooster.role));

      const bRoles = Array.isArray(matchedBooster.roles) ? [...matchedBooster.roles] : [matchedBooster.role || 'Booster'];
      if (isStaffOrAdmin && !bRoles.some(r => /admin|staff/i.test(r))) {
        bRoles.push('Staff / Admin');
      }

      this.currentUser = {
        id: 'booster_' + (matchedBooster.discord_id || googleId),
        type: isStaffOrAdmin ? 'admin' : 'booster',
        discordId: matchedBooster.discord_id || null,
        discordTag: matchedBooster.username,
        discordConnected: !!matchedBooster.discord_id,
        googleId: googleId,
        googleEmail: email,
        googleConnected: true,
        username: matchedBooster.username,
        role: matchedBooster.role || 'Booster',
        roles: bRoles,
        points: matchedBooster.points,
        approved: matchedBooster.approved,
        balance: matchedBooster.balance || 0.00,
        email: email,
        avatar: avatar || matchedBooster.avatar || '',
        payoutMethod: matchedBooster.payout_method || 'Binance Pay / USDT',
        isAdmin: isStaffOrAdmin,
        isBooster: true
      };
      this.saveUser();
      this.showToast(`¡Conectado como Booster ${matchedBooster.username} con tu cuenta de Google!`, 'success');
      this.renderHeader();
      window.location.href = isStaffOrAdmin ? 'admin' : 'pro';
      return { status: isStaffOrAdmin ? 'ADMIN_LOGGED_IN' : 'BOOSTER_LOGGED_IN', user: this.currentUser };
    }

    // 3. Check if email matches existing client or create new client
    let matchedClient = this.clients ? this.clients.find(c => c.email && c.email.toLowerCase() === email) : null;
    if (matchedClient) {
      this.currentUser = {
        id: matchedClient.id,
        type: 'client',
        discordId: matchedClient.discord_id || null,
        discordTag: matchedClient.discord_tag || null,
        discordConnected: !!matchedClient.discord_id,
        googleId: googleId,
        googleEmail: email,
        googleConnected: true,
        username: matchedClient.username || name,
        role: 'Cliente',
        roles: ['Cliente'],
        email: email,
        country: matchedClient.country || 'Global',
        avatar: avatar || matchedClient.avatar || '',
        balance: matchedClient.balance || 0.00,
        isAdmin: false,
        isBooster: false
      };
    } else {
      this.currentUser = {
        id: 'client_g_' + googleId,
        type: 'client',
        discordId: null,
        discordTag: null,
        discordConnected: false,
        googleId: googleId,
        googleEmail: email,
        googleConnected: true,
        username: name,
        role: 'Cliente',
        roles: ['Cliente'],
        email: email,
        country: 'Global',
        avatar: avatar || '',
        balance: 0.00,
        isAdmin: false,
        isBooster: false
      };
      if (this.clients) {
        this.clients.push({
          id: this.currentUser.id,
          username: name,
          email: email,
          discord_id: null,
          discord_tag: null,
          country: 'Global',
          totalOrders: 0,
          totalSpent: 0.00
        });
        this.saveClients();
      }
    }

    this.saveUser();
    this.showToast(`¡Bienvenido ${this.currentUser.username}! Conectado con tu cuenta de Google.`, 'success');
    this.renderHeader();
    window.location.href = 'client-profile';
    return { status: 'CLIENT_LOGGED_IN', user: this.currentUser };
  }

  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  renderLinkedAccountsWidget(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const user = this.currentUser;
    if (!user) return;

    const hasDiscord = !!(user.discordId || user.discordConnected || user.discordTag);
    const hasGoogle = !!(user.googleId || user.googleConnected || user.googleEmail || (user.email && user.email.includes('@gmail.com')));

    container.innerHTML = `
      <!-- DISCORD CARD -->
      <div class="bg-[#171226] p-4 rounded-2xl border ${hasDiscord ? 'border-[#5865F2]/40' : 'border-stone-800'} flex flex-col justify-between space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-[#5865F2] flex items-center justify-center text-white shadow-md">
              <i class="fa-brands fa-discord text-lg"></i>
            </div>
            <div>
              <div class="text-xs font-bold text-white leading-tight">Discord</div>
              <span class="text-[10px] text-stone-400 font-mono-gaming">${hasDiscord ? (user.discordTag || ('ID: ' + user.discordId)) : 'Sin vincular'}</span>
            </div>
          </div>
          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${hasDiscord ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60' : 'bg-stone-900 text-stone-400 border border-stone-800'}">
            <i class="fa-solid ${hasDiscord ? 'fa-circle-check text-emerald-400' : 'fa-circle-xmark text-stone-500'}"></i>
            <span>${hasDiscord ? 'Vinculado' : 'No vinculado'}</span>
          </span>
        </div>
        <div>
          ${hasDiscord ? `
            <div class="text-[11px] text-stone-400">Tu bot de Discord y roles oficiales están sincronizados con este perfil.</div>
          ` : `
            <button type="button" onclick="app.linkDiscordAccount()" class="w-full py-2 px-3 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm">
              <i class="fa-brands fa-discord"></i>
              <span>Vincular mi Discord</span>
            </button>
          `}
        </div>
      </div>

      <!-- GOOGLE CARD -->
      <div class="bg-[#18110b] p-4 rounded-2xl border ${hasGoogle ? 'border-[#4285F4]/40' : 'border-stone-800'} flex flex-col justify-between space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-md">
              <svg class="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
            </div>
            <div>
              <div class="text-xs font-bold text-white leading-tight">Google</div>
              <span class="text-[10px] text-stone-400 font-mono-gaming truncate max-w-[140px] block">${hasGoogle ? (user.googleEmail || user.email) : 'Sin vincular'}</span>
            </div>
          </div>
          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${hasGoogle ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60' : 'bg-stone-900 text-stone-400 border border-stone-800'}">
            <i class="fa-solid ${hasGoogle ? 'fa-circle-check text-emerald-400' : 'fa-circle-xmark text-stone-500'}"></i>
            <span>${hasGoogle ? 'Vinculado' : 'No vinculado'}</span>
          </span>
        </div>
        <div>
          ${hasGoogle ? `
            <div class="text-[11px] text-stone-400">Puedes iniciar sesión directamente con tu correo de Google.</div>
          ` : `
            <button type="button" onclick="app.linkGoogleAccount()" class="w-full py-2 px-3 rounded-xl bg-white hover:bg-stone-200 text-stone-900 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Vincular mi Google</span>
            </button>
          `}
        </div>
      </div>
    `;
  }

  loginAsDemoBooster() {
    this.closeAuthModal();
    const gate = document.getElementById('pro-access-gate');
    if (gate) gate.remove();
    this.currentUser = {
      id: 'booster_pro_demo',
      type: 'booster',
      username: 'Booster Pro (Demo)',
      role: 'Master Booster',
      roles: ['Master Booster', 'Booster'],
      points: 250,
      approved: true,
      balance: 320.00,
      payoutMethod: 'Binance Pay / USDT',
      payoutAddress: '44394877',
      isAdmin: false,
      isBooster: true
    };
    this.saveUser();
    this.showToast('¡Sesión iniciada en Modo Booster Pro!', 'success');
    if (window.location.pathname.toLowerCase().includes('pro')) {
      window.location.reload();
    } else {
      window.location.href = 'pro';
    }
  }

  loginAsDemoClient() {
    this.authenticateWithDiscord('987654321012345678', 'Carlos M.');
    this.closeAuthModal();
    window.location.href = 'client-profile';
  }

  updateClientProfile(data) {
    if (!this.currentUser) return;
    this.currentUser.username = data.username || this.currentUser.username;
    this.currentUser.email = data.email || this.currentUser.email;
    this.currentUser.country = data.country || this.currentUser.country;
    this.currentUser.battletag = data.battletag || this.currentUser.battletag;
    this.currentUser.discordId = data.discordId || this.currentUser.discordId;
    if (data.password) this.currentUser.password = data.password;

    this.saveUser();
    this.showToast('Tus datos de perfil han sido actualizados con éxito.', 'success');
    this.renderHeader();
  }

  // ==========================================
  
// CART MANAGEMENT (Req 2: Add to cart & Total)
  // ==========================================
  addToCart(item, openDrawer = true) {
    if (!item) return;

    // Resolve robust unit and total prices
    const rawUnitPrice = Math.max(0, Number(
      item.unitPrice !== undefined && !isNaN(Number(item.unitPrice))
        ? item.unitPrice
        : (item.price !== undefined && !isNaN(Number(item.price)) ? item.price : (item.totalPrice || 0))
    ) || 0);

    const qty = Math.max(1, Number(item.quantity || 1));
    const rawTotalPrice = Math.max(0, Number(
      item.totalPrice !== undefined && !isNaN(Number(item.totalPrice))
        ? item.totalPrice
        : (rawUnitPrice * qty)
    ) || (rawUnitPrice * qty));

    // Generate unique cart item id
    const cartItem = {
      cartId: item.cartId || ('item_' + Date.now() + '_' + Math.floor(Math.random() * 1000)),
      serviceId: item.serviceId || 'svc_custom',
      serviceName: item.serviceName || 'Servicio WoW',
      category: item.category || 'Servicios',
      unitPrice: rawUnitPrice,
      price: rawUnitPrice,
      quantity: qty,
      totalPrice: rawTotalPrice,
      character: item.character || 'Personaje-Reino',
      mode: item.mode || 'Self-Play',
      region: item.region || 'US',
      details: item.details || '',
      referredBooster: item.referredBooster || sessionStorage.getItem('mp_upsell_booster') || null
    };

    this.cart.push(cartItem);
    this.saveCart();
    this.updateCartCounter();
    this.renderCartItems();
    this.showToast(`¡Añadido al carrito: ${cartItem.serviceName}!`, 'success');

    if (openDrawer) {
      this.openCartModal();
    }
  }

  removeFromCart(cartId) {
    this.cart = this.cart.filter(item => item.cartId !== cartId);
    this.saveCart();
    this.renderCartItems();
    this.showToast('Producto eliminado del carrito.', 'info');
  }

  updateCartItemQty(cartId, delta) {
    const item = this.cart.find(i => i.cartId === cartId);
    if (!item) return;

    item.quantity = Math.max(1, item.quantity + delta);
    const unit = Number(item.unitPrice || item.price || 0) || 0;
    item.totalPrice = Math.round(unit * item.quantity * 100) / 100;
    this.saveCart();
    this.renderCartItems();
  }

  getCartTotal() {
    return this.cart.reduce((sum, item) => sum + (Number(item.totalPrice || item.price || 0) || 0), 0);
  }

  updateCartCounter() {
    const counters = document.querySelectorAll('.cart-counter-badge');
    const totalItems = this.cart.reduce((sum, i) => sum + (i.quantity || 1), 0);
    counters.forEach(badge => {
      badge.textContent = totalItems;
      if (totalItems > 0) {
        badge.classList.remove('hidden');
      }
    });
  }

  openCartModal() {
    const modal = document.getElementById('cart-drawer-modal') || document.getElementById('cart-modal');
    if (!modal) return;
    this.renderCartItems();
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  closeCartModal() {
    const modal = document.getElementById('cart-drawer-modal') || document.getElementById('cart-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  renderCartItems() {
    const container = document.getElementById('cart-items-container');
    const totalElem = document.getElementById('cart-total-display') || document.getElementById('cart-total-price');
    if (!container) return;

    const total = this.getCartTotal();
    if (totalElem) totalElem.textContent = `$${total.toFixed(2)}`;

    if (this.cart.length === 0) {
      container.innerHTML = `
        <div class="py-12 text-center">
          <i class="fa-solid fa-cart-shopping text-4xl text-stone-600 mb-3"></i>
          <h4 class="text-sm font-bold text-stone-300">Tu carrito está vacío</h4>
          <p class="text-xs text-stone-500 mt-1">Explora nuestro catálogo para añadir mazmorras, bandas o nivelación.</p>
        </div>
      `;
      const btn = document.getElementById('btn-checkout-cart');
      if (btn) btn.disabled = true;
      return;
    }

    const btn = document.getElementById('btn-checkout-cart');
    if (btn) btn.disabled = false;

    container.innerHTML = this.cart.map(item => {
      const itemPrice = Number(item.totalPrice || item.price || 0) || 0;
      return `
        <div class="bg-[#150f0c] p-3.5 rounded-xl border border-stone-800 flex items-center justify-between gap-3 mb-3">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-[#251b14] text-[#ee914f] border border-[#ee914f]/30">${item.category}</span>
              <span class="text-[10px] text-stone-400">${item.mode} (${item.region})</span>
            </div>
            <h5 class="text-xs font-bold text-[#fcefc2] leading-tight">${item.serviceName}</h5>
            <span class="text-[11px] text-stone-400">Pj: ${item.character}</span>
          </div>

          <div class="flex items-center gap-3">
            <div class="flex items-center gap-1 bg-[#1c1510] border border-stone-700 rounded-lg p-1">
              <button onclick="app.updateCartItemQty('${item.cartId}', -1)" class="w-6 h-6 flex items-center justify-center text-xs text-stone-400 hover:text-white">-</button>
              <span class="text-xs font-bold font-mono-gaming text-white px-1.5">${item.quantity}</span>
              <button onclick="app.updateCartItemQty('${item.cartId}', 1)" class="w-6 h-6 flex items-center justify-center text-xs text-stone-400 hover:text-white">+</button>
            </div>

            <div class="text-right min-w-[70px]">
              <div class="text-sm font-bold font-mono-gaming text-[#fcefc2]">$${itemPrice.toFixed(2)}</div>
              <button onclick="app.removeFromCart('${item.cartId}')" class="text-[10px] text-stone-500 hover:text-red-400">
                <i class="fa-solid fa-trash mr-1"></i>Quitar
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  processFullCartCheckout() {
    if (this.cart.length === 0) return;

    if (!this.currentUser) {
      this.currentUser = {
        id: 'client_carlos',
        username: 'Carlos M.',
        email: 'carlos.wow@gmail.com',
        discordId: 'CarlosWoW#4819',
        type: 'client',
        country: 'Estados Unidos',
        battletag: 'CarlosWoW#1234'
      };
      this.saveUser();
      this.renderHeader();
    }

    const createdOrderIds = [];
    this.cart.forEach(item => {
      const isUpsell = !!item.referredBooster;
      const finalPrice = Math.max(0, Number(
        item.totalPrice !== undefined && !isNaN(Number(item.totalPrice))
          ? item.totalPrice
          : (item.price !== undefined && !isNaN(Number(item.price))
              ? item.price
              : ((Number(item.unitPrice) || 0) * (Number(item.quantity) || 1)))
      ) || 45.00);

      const econ = this.calculateEconomics(finalPrice, isUpsell);
      const charStr = item.character || 'Heroe-Area 52';
      const realmName = (charStr.includes('-')) ? charStr.split('-')[1].trim() : 'Area 52';

      const newOrder = {
        id: 'MP-' + Math.floor(10000 + Math.random() * 90000),
        serviceName: `${item.serviceName}${item.quantity > 1 ? ` (x${item.quantity})` : ''}`,
        category: item.category || 'Servicios',
        region: item.region || 'US',
        faction: 'Horda',
        realm: realmName,
        characterName: charStr,
        completionMethod: item.mode || 'Piloted',
        vpnLocation: (item.mode && String(item.mode).toLowerCase().includes('piloted')) ? 'Estados Unidos (Chicago)' : 'N/A (Self-play)',
        details: item.details || '',
        clientId: this.currentUser.id,
        clientEmail: this.currentUser.email,
        clientDiscord: this.currentUser.discordId,
        clientName: this.currentUser.username,
        totalPrice: finalPrice,
        price: finalPrice,
        companyShare: econ.company,
        boosterPayout: econ.booster,
        boosterPayoutRate: econ.boosterRate,
        maxBidAllowed: econ.maxBid,
        status: 'AVAILABLE',
        bids: [],
        assignedBooster: null,
        isOnAccount: false,
        createdAt: new Date().toISOString(),
        chat: []
      };

      if (item.referredBooster) newOrder.referredByBooster = item.referredBooster;
      this.orders.unshift(newOrder);
      createdOrderIds.push(newOrder.id);
    });

    this.saveOrders();
    this.cart = [];
    this.saveCart();
    this.closeCartModal();

    this.showToast(`¡Pago completado! Se crearon ${createdOrderIds.length} orden(es). Redirigiendo a tu perfil...`, 'success');
    setTimeout(() => {
      window.location.href = 'client-profile';
    }, 1200);
  }

  // ==========================================
  
// LIVE SEARCH BAR (Req 1)
  // ==========================================
  setupLiveSearch() {
    const input = document.getElementById('header-search-input');
    const dropdown = document.getElementById('header-search-results');
    if (!input || !dropdown) return;

    input.addEventListener('input', (e) => {
      const query = e.target.value.trim().toLowerCase();
      if (!query) {
        dropdown.classList.add('hidden');
        return;
      }

      const results = this.services.filter(s => 
        s.name.toLowerCase().includes(query) ||
        s.category.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query)
      );

      if (results.length === 0) {
        dropdown.innerHTML = `<div class="p-3 text-xs text-stone-500 text-center">No se encontraron servicios para "${query}"</div>`;
      } else {
        dropdown.innerHTML = results.map(s => `
          <a href="product?id=${s.id}" class="p-3 hover:bg-[#201812] flex items-center justify-between border-b border-stone-800 last:border-0 transition-colors">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-[#251b14] border border-[#ee914f]/30 flex items-center justify-center text-[#ee914f] text-sm">
                <i class="fa-solid ${s.icon}"></i>
              </div>
              <div>
                <div class="text-xs font-bold text-[#fcefc2]">${s.name}</div>
                <div class="text-[10px] text-stone-400">${s.category}</div>
              </div>
            </div>
            <div class="text-xs font-bold font-mono-gaming text-[#ee914f]">$${s.basePrice.toFixed(2)}</div>
          </a>
        `).join('');
      }

      dropdown.classList.remove('hidden');
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.add('hidden');
      }
    });
  }

  // ==========================================
  
  // ==========================================
  // SINGLE PRODUCT PAGE (Req 4 & EXACT IMAGE 4)
  // ==========================================
  initSingleProductPage() {
    const params = new URLSearchParams(window.location.search);
    const serviceId = params.get('id') || 'mplus-keystone';
    const svc = this.services.find(s => s.id === serviceId) || this.services[0];
    if (!svc) return;

    this.currentProduct = svc;
    this.currentRunsQuantity = 1;
    this.currentPromoDiscount = 0;
    this.currentSpKeyPrice = svc.basePrice;

    const isLeveling = (svc.id === 'powerleveling-80' || svc.category === 'Powerleveling');
    if (isLeveling) {
      this.initLevelingState(svc);
    }

    // Breadcrumbs & Title
    const titleEl = document.getElementById('sp-title');
    if (titleEl) { titleEl.textContent = svc.name; titleEl.classList.add('notranslate'); titleEl.setAttribute('translate', 'no'); }
    const catEl = document.getElementById('sp-breadcrumb-cat');
    if (catEl) catEl.textContent = svc.category;
    const backEl = document.getElementById('sp-breadcrumb-back');
    if (backEl) backEl.textContent = svc.category;
    const nameEl = document.getElementById('sp-breadcrumb-name');
    if (nameEl) nameEl.textContent = svc.name;
    const descEl = document.getElementById('sp-description');
    if (descEl) descEl.textContent = svc.description;

    // Dynamic Hero Badges (Top Left)
    const badgesContainer = document.getElementById('sp-badges-container');
    if (badgesContainer && svc.options?.heroBadges && Array.isArray(svc.options.heroBadges)) {
      badgesContainer.innerHTML = svc.options.heroBadges.map((bText, idx) => `
        <span class="px-3 py-1 rounded-md ${idx === 2 ? 'bg-indigo-950/80 text-indigo-200 border-indigo-600/50' : 'bg-purple-950/80 text-purple-200 border-purple-600/50'} border text-[11px] font-bold shadow-md">
          ${bText}
        </span>
      `).join('');
    }

    // Dynamic Review Widget
    if (svc.options?.review) {
      const rev = svc.options.review;
      const authorEl = document.getElementById('sp-review-author');
      if (authorEl && rev.author) authorEl.textContent = rev.author;
      const textEl = document.getElementById('sp-review-text');
      if (textEl && rev.quote) textEl.textContent = rev.quote;
      const ratingEl = document.getElementById('sp-review-rating');
      if (ratingEl && rev.rating && rev.count) {
        ratingEl.innerHTML = `<strong class="text-white">${rev.rating}</strong> Basado en ${rev.count} opiniones`;
      }
    }

    // Dynamic Checklist and Description Extra
    const chkTitleEl = document.getElementById('sp-checklist-title');
    const chkContainer = document.getElementById('sp-checklist-container');
    if (isLeveling) {
      if (chkTitleEl) chkTitleEl.textContent = '¿Qué obtienes con nuestro servicio de Powerleveling?:';
      if (chkContainer) {
        chkContainer.innerHTML = `
          <div class="space-y-3 pt-1">
            <div class="flex items-start gap-3">
              <div class="w-6 h-6 rounded-full bg-stone-900 border border-stone-700 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">1</div>
              <p class="text-xs text-stone-300 leading-snug">Subida de nivel garantizada para tu personaje hasta el nivel objetivo seleccionado (desde nivel 1 hasta 80/90).</p>
            </div>
            <div class="flex items-start gap-3">
              <div class="w-6 h-6 rounded-full bg-stone-900 border border-stone-700 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">2</div>
              <p class="text-xs text-stone-300 leading-snug">Método 100% manual y AFK con opción Self-play o Piloted seguro con VPN y streaming opcional en Discord.</p>
            </div>
            <div class="flex items-start gap-3">
              <div class="w-6 h-6 rounded-full bg-stone-900 border border-stone-700 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">3</div>
              <p class="text-xs text-stone-300 leading-snug">Progreso en campaña de la expansión, puntos de talento y desbloqueo de contenido de nivel máximo.</p>
            </div>
            <div class="flex items-start gap-3">
              <div class="w-6 h-6 rounded-full bg-stone-900 border border-stone-700 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">4</div>
              <p class="text-xs text-stone-300 leading-snug">Todo el oro, piezas de equipo, monturas o materiales recolectados durante la subida quedan en tu personaje.</p>
            </div>
          </div>
          <div class="mt-4 pt-3 border-t border-stone-800 text-[11px] text-stone-400 space-y-1.5">
            <strong class="text-[#eedaa2] block uppercase tracking-wider text-[10px]">Opciones de Equipamiento (Gearing):</strong>
            <div>• <strong class="text-stone-300">Honor PvP Gear:</strong> Conjunto completo JcJ con versatilidad para saltar directo a campos de batalla y arenas.</div>
            <div>• <strong class="text-stone-300">Full Dungeon Gear 642+:</strong> Equipo de mazmorras de temporada preparado para Míticas+ y bandas.</div>
          </div>
        `;
      }
    } else if (svc.id === 'mplus-keystone') {
      if (chkTitleEl) chkTitleEl.textContent = '¿Qué obtienes con nuestro servicio de Míticas+?:';
      if (chkContainer) {
        chkContainer.innerHTML = `
          <div class="space-y-3 pt-1">
            <div class="flex items-start gap-3">
              <div class="w-6 h-6 rounded-full bg-stone-900 border border-stone-700 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">1</div>
              <p class="text-xs text-stone-300 leading-snug">Runs de mazmorras Míticas+ (+2 a +15) con equipo profesional de élite en tiempo garantizado.</p>
            </div>
            <div class="flex items-start gap-3">
              <div class="w-6 h-6 rounded-full bg-stone-900 border border-stone-700 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">2</div>
              <p class="text-xs text-stone-300 leading-snug">Botín directo de hasta <strong class="text-[#fcefc2]">311 ilvl (Track Héroe)</strong> en el cofre al finalizar la mazmorra con tus traders de armadura.</p>
            </div>
            <div class="flex items-start gap-3">
              <div class="w-6 h-6 rounded-full bg-stone-900 border border-stone-700 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">3</div>
              <p class="text-xs text-stone-300 leading-snug">Recompensa semanal de hasta <strong class="text-[#5eead4]">318 ilvl (Track Mito BiS)</strong> en la Gran Cámara para tu personaje.</p>
            </div>
            <div class="flex items-start gap-3">
              <div class="w-6 h-6 rounded-full bg-stone-900 border border-stone-700 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">4</div>
              <p class="text-xs text-stone-300 leading-snug">Blasones de mejora: Campeón, Héroe y <strong class="text-amber-400">Míticos (Myth Crests)</strong> para subir tu equipo al máximo.</p>
            </div>
            <div class="flex items-start gap-3">
              <div class="w-6 h-6 rounded-full bg-stone-900 border border-stone-700 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">5</div>
              <p class="text-xs text-stone-300 leading-snug">Telepuertos a mazmorras (+10 en tiempo) y progreso hacia los títulos y monturas de Keystone Master / Keystone Hero.</p>
            </div>
          </div>
        `;
      }
    } else if (svc.id === 'the-venomous-abyss' || svc.id === 'liberation-of-undermine') {
      if (chkTitleEl) chkTitleEl.textContent = '¿Qué obtienes en la nueva banda El Abismo Venenoso?:';
      if (chkContainer) {
        chkContainer.innerHTML = `
          <div class="space-y-3 pt-1">
            <div class="flex items-start gap-3">
              <div class="w-6 h-6 rounded-full bg-stone-900 border border-stone-700 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">1</div>
              <p class="text-xs text-stone-300 leading-snug">Derrota garantizada de los 8 jefes del Abismo Venenoso incluyendo a <strong class="text-[#fcefc2]">Ula'tek (Jefe Final)</strong>.</p>
            </div>
            <div class="flex items-start gap-3">
              <div class="w-6 h-6 rounded-full bg-stone-900 border border-stone-700 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">2</div>
              <p class="text-xs text-stone-300 leading-snug">Botín oficial de <strong class="text-[#eedaa2]">292 a 324+ ilvl</strong> (hasta 344 ilvl Very Rare en dificultad Mítica).</p>
            </div>
            <div class="flex items-start gap-3">
              <div class="w-6 h-6 rounded-full bg-stone-900 border border-stone-700 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">3</div>
              <p class="text-xs text-stone-300 leading-snug">Logro oficial de hermandad <strong class="text-amber-400">Ahead of the Curve (AOTC): Ula'tek</strong> en dificultad Heroica.</p>
            </div>
            <div class="flex items-start gap-3">
              <div class="w-6 h-6 rounded-full bg-stone-900 border border-stone-700 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">4</div>
              <p class="text-xs text-stone-300 leading-snug">Tokens de conjunto de clase (Tier Set), monturas y progreso en la ranura de banda de la Gran Cámara.</p>
            </div>
          </div>
        `;
      }
    } else if (svc.id === 'delves-midnight' || svc.id === 'delves-tww') {
      if (chkTitleEl) chkTitleEl.textContent = '¿Qué obtienes en las Profundidades (Delves)?:';
      if (chkContainer) {
        chkContainer.innerHTML = `
          <div class="space-y-3 pt-1">
            <div class="flex items-start gap-3">
              <div class="w-6 h-6 rounded-full bg-stone-900 border border-stone-700 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">1</div>
              <p class="text-xs text-stone-300 leading-snug">Runs rápidos en <strong class="text-[#fcefc2]">Tier 8 (Sweet Spot)</strong>: el nivel óptimo para equipar personajes en la temporada actual.</p>
            </div>
            <div class="flex items-start gap-3">
              <div class="w-6 h-6 rounded-full bg-stone-900 border border-stone-700 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">2</div>
              <p class="text-xs text-stone-300 leading-snug">Botín directo de <strong class="text-[#eedaa2]">298 ilvl (Track Campeón)</strong> abriendo el cofre abundante con Llave Restaurada.</p>
            </div>
            <div class="flex items-start gap-3">
              <div class="w-6 h-6 rounded-full bg-stone-900 border border-stone-700 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">3</div>
              <p class="text-xs text-stone-300 leading-snug">Desbloquea hasta 3 ranuras de la Gran Cámara (Mundo) de <strong class="text-[#5eead4]">311 ilvl (Track Héroe)</strong> con 8 runs.</p>
            </div>
            <div class="flex items-start gap-3">
              <div class="w-6 h-6 rounded-full bg-stone-900 border border-stone-700 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">4</div>
              <p class="text-xs text-stone-300 leading-snug">Opción de derrotar al <strong class="text-purple-400">Némesis de Temporada</strong> para conseguir la montura exclusiva y el título.</p>
            </div>
          </div>
        `;
      }
    } else if (svc.id === 'ilvl-gearing') {
      if (chkTitleEl) chkTitleEl.textContent = '¿Qué incluye tu Paquete de Equipamiento?:';
      if (chkContainer) {
        chkContainer.innerHTML = `
          <div class="space-y-3 pt-1">
            <div class="flex items-start gap-3">
              <div class="w-6 h-6 rounded-full bg-stone-900 border border-stone-700 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">1</div>
              <p class="text-xs text-stone-300 leading-snug">Conjunto de equipo completo para cada ranura de tu personaje optimizado según tu especialización (BiS).</p>
            </div>
            <div class="flex items-start gap-3">
              <div class="w-6 h-6 rounded-full bg-stone-900 border border-stone-700 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">2</div>
              <p class="text-xs text-stone-300 leading-snug">Combinación estratégica de Delves Tier 8, Míticas+ (+2 a +10) y Raid El Abismo Venenoso.</p>
            </div>
            <div class="flex items-start gap-3">
              <div class="w-6 h-6 rounded-full bg-stone-900 border border-stone-700 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">3</div>
              <p class="text-xs text-stone-300 leading-snug">Rangos de equipamiento garantizados desde <strong class="text-stone-300">292 ilvl (Starter)</strong> hasta <strong class="text-[#5eead4]">344 ilvl (BiS Mítico)</strong>.</p>
            </div>
            <div class="flex items-start gap-3">
              <div class="w-6 h-6 rounded-full bg-stone-900 border border-stone-700 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">4</div>
              <p class="text-xs text-stone-300 leading-snug">Blasones y monedas de mejora suficientes para llevar tus piezas al nivel máximo de cada rango.</p>
            </div>
          </div>
        `;
      }
    }

    // Dynamic Time Estimates
    const startEl = document.getElementById('sp-est-start');
    if (startEl && svc.options?.estimates?.start) startEl.textContent = svc.options.estimates.start;
    const execEl = document.getElementById('sp-est-execution');
    if (execEl && svc.options?.estimates?.execution) execEl.textContent = svc.options.estimates.execution;

    // Stepper Title & Initial Hint
    const stepperTitle = document.getElementById('sp-stepper-title');
    if (stepperTitle) stepperTitle.textContent = isLeveling ? 'Número de Personajes' : 'Runs';
    const hintEl = document.getElementById('sp-discount-hint');
    if (hintEl) hintEl.textContent = isLeveling ? 'Añade 1 personaje más para 5% de descuento' : 'Añade 1 run más para 5% de descuento';

    this.renderSingleProductOptions(svc);
    this.recalculateSingleProductTotal();
    this.renderRelatedProducts(svc);
    this.initRealmSelector();
  }

  renderSingleProductOptions(svc) {
    const container = document.getElementById('sp-options-form');
    if (!container) return;

    if (svc.id === 'powerleveling-80' || svc.category === 'Powerleveling') {
      this.renderLevelingProductOptions(svc);
      return;
    }

    if (svc.id === 'mplus-keystone' || svc.category === 'Míticas Plus') {
      const opts = svc.options || {};
      const keyLevels = (opts.keyLevels && opts.keyLevels.length > 0) ? opts.keyLevels : [
        { level: 2, price: 12.00, recommended: false },
        { level: 4, price: 16.00, recommended: false },
        { level: 6, price: 22.00, recommended: false },
        { level: 8, price: 28.00, recommended: false },
        { level: 10, price: 38.00, recommended: true },
        { level: 12, price: 52.00, recommended: false },
        { level: 14, price: 70.00, recommended: false },
        { level: 15, price: 85.00, recommended: false },
        { level: 18, price: 115.00, recommended: false },
        { level: 20, price: 145.00, recommended: false }
      ];

      const timerOpt = opts.timer || { enabled: true, label: 'Timer guaranteed', price: 0 };

      const traders = (opts.lootTraders && opts.lootTraders.length > 0) ? opts.lootTraders : [
        { label: 'Premium Group (x2 loot-traders)', price: 0 },
        { label: 'VIP Group (+3 loot-traders)', price: 2.27 },
        { label: 'Top Group (+4 loot-traders)', price: 2.92 }
      ];

      const dungeons = (opts.dungeons && opts.dungeons.length > 0) ? opts.dungeons : [
        'Random Dungeon (Más Rápido)',
        'The Stonevault',
        'City of Threads',
        'The Dawnbreaker',
        'Ara-Kara, City of Echoes',
        'Grim Batol',
        'The Necrotic Wake',
        'Mists of Tirna Scithe',
        'Siege of Boralus'
      ];

      const modes = (opts.completionMethods && opts.completionMethods.length > 0) ? opts.completionMethods : [
        { label: 'Self-play', price: 0, tag: 'Gratis' },
        { label: 'Piloted (Juega un Pro con VPN)', price: 0, tag: 'Incluido' },
        { label: 'Self-play Remote', price: 1.95, tag: '+$1.95' }
      ];

      const extras = (opts.extras && opts.extras.length > 0) ? opts.extras : [
        { label: 'Rank One Team', price: 1.95 },
        { label: 'Stream Privado en Discord', price: 2.50 }
      ];

      const recLvl = keyLevels.find(l => l.recommended) || keyLevels[0];
      this.currentSpKeyPrice = recLvl ? Number(recLvl.price) : 38.00;

      container.innerHTML = `
        <div class="space-y-5">
          <!-- Keystone Level Dropdown -->
          <div>
            <label class="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5">
              Keystone Level:
            </label>
            <select id="sp-key-level" onchange="app.onSpKeyLevelSelect(this.value)" class="w-full bg-[#18110b] border border-stone-700 rounded-xl px-4 py-3 text-xs text-[#fcefc2] font-semibold focus:border-[#ee914f] outline-none">
              ${keyLevels.map(k => `
                <option value="${k.price}" data-level="${k.level}" ${k.recommended ? 'selected' : ''}>
                  Mythic +${k.level} ($${Number(k.price).toFixed(2)})${k.recommended ? ' - Recomendado' : ''}
                </option>
              `).join('')}
            </select>
          </div>

          <!-- Timer Option -->
          ${timerOpt.enabled ? `
            <div>
              <label class="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5">
                Timer Option:
              </label>
              <div class="bg-[#18110b] p-3 rounded-xl border border-stone-800 flex items-center justify-between">
                <label class="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-stone-200">
                  <input type="checkbox" id="sp-opt-timer" data-price="${timerOpt.price || 0}" checked onchange="app.recalculateSingleProductTotal()" class="w-4 h-4 accent-[#ee914f] rounded">
                  <span>${timerOpt.label || 'Timer guaranteed'}</span>
                </label>
                <span class="text-xs ${Number(timerOpt.price) > 0 ? 'text-[#ee914f] font-mono-gaming' : 'text-emerald-400'} font-bold">
                  ${Number(timerOpt.price) > 0 ? '+$' + Number(timerOpt.price).toFixed(2) : 'Free'}
                </span>
              </div>
            </div>
          ` : ''}

          <!-- Loot-traders -->
          <div>
            <label class="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5">
              Loot-traders:
            </label>
            <div class="space-y-2">
              ${traders.map((t, idx) => `
                <label class="flex items-center justify-between p-3 rounded-xl bg-[#18110b] border border-stone-800 hover:border-stone-700 cursor-pointer transition-colors">
                  <div class="flex items-center gap-2.5 text-xs text-stone-200">
                    <input type="radio" name="sp_traders" value="${t.price}" ${idx === 0 ? 'checked' : ''} onchange="app.recalculateSingleProductTotal()" class="accent-[#ee914f]">
                    <span>${t.label}</span>
                    ${Number(t.price) > 0 ? '<i class="fa-solid fa-circle-info text-[10px] text-stone-500"></i>' : ''}
                  </div>
                  <span class="text-xs ${Number(t.price) > 0 ? 'text-[#ee914f] font-mono-gaming' : 'text-stone-400'} font-bold">
                    ${Number(t.price) > 0 ? '+$' + Number(t.price).toFixed(2) : 'Free'}
                  </span>
                </label>
              `).join('')}
            </div>
          </div>

          <!-- Select Dungeon -->
          <div>
            <label class="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5">
              Select Dungeon:
            </label>
            <select id="sp-dungeon-select" class="w-full bg-[#18110b] border border-stone-700 rounded-xl px-4 py-3 text-xs text-stone-200 outline-none focus:border-[#ee914f]">
              ${dungeons.map(d => `<option value="${d}">${d}</option>`).join('')}
            </select>
          </div>

          <!-- Completion Method -->
          <div>
            <label class="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5">
              Completion Method:
            </label>
            <div class="space-y-2">
              ${modes.map((m, idx) => `
                <label class="flex items-center justify-between p-3 rounded-xl bg-[#18110b] border border-stone-800 cursor-pointer">
                  <div class="flex items-center gap-2.5 text-xs text-stone-200">
                    <input type="radio" name="sp_mode" value="${m.label}" data-price="${m.price || 0}" ${idx === 0 ? 'checked' : ''} onchange="app.recalculateSingleProductTotal()" class="accent-[#ee914f]">
                    <span>${m.label}</span>
                    ${Number(m.price) > 0 ? '<i class="fa-solid fa-circle-info text-[10px] text-stone-500"></i>' : ''}
                  </div>
                  <span class="text-xs ${Number(m.price) > 0 ? 'text-[#ee914f] font-mono-gaming' : (m.tag === 'Gratis' ? 'text-emerald-400' : 'text-stone-400')} font-bold">
                    ${m.tag || (Number(m.price) > 0 ? '+$' + Number(m.price).toFixed(2) : 'Gratis')}
                  </span>
                </label>
              `).join('')}
            </div>
          </div>

          <!-- Choose Extras -->
          <div>
            <label class="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5">
              Choose Extras:
            </label>
            <div class="space-y-2">
              ${extras.map(ex => `
                <label class="flex items-center justify-between p-3 rounded-xl bg-[#18110b] border border-stone-800 cursor-pointer">
                  <div class="flex items-center gap-2.5 text-xs text-stone-200">
                    <input type="checkbox" name="sp_extra_option" data-price="${ex.price || 0}" onchange="app.recalculateSingleProductTotal()" class="w-4 h-4 accent-[#ee914f] rounded">
                    <span>${ex.label}</span>
                    <i class="fa-solid fa-circle-info text-[10px] text-stone-500"></i>
                  </div>
                  <span class="text-xs text-[#ee914f] font-mono-gaming font-bold">+$${Number(ex.price).toFixed(2)}</span>
                </label>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    } else {
      // General PvE category form (Raids, Leveling, Gearing)
      container.innerHTML = `
        <div class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5">Opción del Servicio:</label>
            <select id="sp-general-opt" onchange="app.onSpGeneralOptSelect(this.value)" class="w-full bg-[#18110b] border border-stone-700 rounded-xl px-4 py-3 text-xs text-[#fcefc2] font-semibold focus:border-[#ee914f] outline-none">
              <option value="${svc.basePrice}" selected>Servicio Estándar ($${svc.basePrice.toFixed(2)})</option>
              <option value="${(svc.basePrice * 1.5).toFixed(2)}">Servicio Express VIP (+$${(svc.basePrice * 0.5).toFixed(2)})</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5">Modalidad:</label>
            <div class="grid grid-cols-2 gap-2">
              <label class="p-3 rounded-xl bg-[#18110b] border border-stone-800 flex items-center gap-2 cursor-pointer">
                <input type="radio" name="sp_mode" value="Self-Play" checked onchange="app.recalculateSingleProductTotal()" class="accent-[#ee914f]">
                <span class="text-xs text-stone-200">Self-Play</span>
              </label>
              <label class="p-3 rounded-xl bg-[#18110b] border border-stone-800 flex items-center gap-2 cursor-pointer">
                <input type="radio" name="sp_mode" value="Piloted" onchange="app.recalculateSingleProductTotal()" class="accent-[#ee914f]">
                <span class="text-xs text-stone-200">Piloted (VPN)</span>
              </label>
            </div>
          </div>
        </div>
      `;
      this.currentSpKeyPrice = svc.basePrice;
    }
  }

  onSpKeyLevelSelect(val) {
    this.currentSpKeyPrice = Number(val) || 38.00;
    this.recalculateSingleProductTotal();
  }

  onSpGeneralOptSelect(val) {
    this.currentSpKeyPrice = Number(val) || this.currentProduct?.basePrice || 25.00;
    this.recalculateSingleProductTotal();
  }

  initLevelingState(svc) {
    const opts = svc?.options || {};
    this.levelMin = Number(opts.minLevel) || 1;
    this.levelMax = Number(opts.maxLevel) || 90;
    this.levelCurrent = Number(opts.defaultCurrentLevel) || 1;
    this.levelDesired = Number(opts.defaultDesiredLevel) || 80;
  }

  renderLevelingProductOptions(svc) {
    const container = document.getElementById('sp-options-form');
    if (!container) return;

    const opts = svc.options || {};
    const completionMethods = (opts.completionMethods && opts.completionMethods.length > 0) ? opts.completionMethods : [
      { label: 'Piloted (VPN)', price: 0, tag: 'Incluido', recommended: true },
      { label: 'Self-play', price: 9.99, tag: '+$9.99' },
      { label: 'Self-play Remote', price: 14.99, tag: '+$14.99' }
    ];

    const gearingOptions = (opts.gearingOptions && opts.gearingOptions.length > 0) ? opts.gearingOptions : [
      { label: 'Not Required', price: 0 },
      { label: 'Starter Gear 554+ (+$12.00)', price: 12.00 },
      { label: 'Honor PvP Gear (+$19.00)', price: 19.00 },
      { label: 'Full Dungeon Gear 580+ (+$29.00)', price: 29.00 },
      { label: 'Champion Raid Ready 593+ (+$45.00)', price: 45.00 }
    ];

    const additionalOptions = (opts.additionalOptions && opts.additionalOptions.length > 0) ? opts.additionalOptions : [
      { label: 'The Venomous Abyss Heroic run', price: 32.99 },
      { label: '8/8 M+0 Dungeons', price: 27.99 },
      { label: 'Midnight Campaign', price: 23.99 },
      { label: 'The War of Light and Shadow Campaign', price: 23.99 },
      { label: 'The Curse of Ula\'tek Campaign', price: 16.99 },
      { label: 'The Promise of Tomorrow Campaign', price: 16.99 },
      { label: 'Haranir Allied Race Unlock', price: 14.99 },
      { label: 'All Skyriding Glyphs', price: 9.99 }
    ];

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Dual Numeric Level Inputs -->
        <div>
          <div class="grid grid-cols-11 gap-2 items-center">
            <div class="col-span-5">
              <label class="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Nivel Actual</span>
                <span class="text-[10px] text-stone-500 font-mono-gaming">Min 1</span>
              </label>
              <div class="relative">
                <input type="number" id="sp-level-current" min="1" max="89" value="${this.levelCurrent}" oninput="app.onLevelNumberInput('current', this.value)" class="w-full bg-[#18110b] border border-stone-700 focus:border-[#ee914f] rounded-xl px-3 py-2.5 text-center font-mono-gaming font-black text-lg text-white outline-none">
                <span class="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-stone-500 font-bold uppercase pointer-events-none">Lvl</span>
              </div>
            </div>

            <div class="col-span-1 text-center font-bold text-stone-500 pt-5 text-lg">
              -
            </div>

            <div class="col-span-5">
              <label class="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Nivel Deseado</span>
                <span class="text-[10px] text-[#ee914f] font-mono-gaming font-bold">Max 90</span>
              </label>
              <div class="relative">
                <input type="number" id="sp-level-desired" min="2" max="90" value="${this.levelDesired}" oninput="app.onLevelNumberInput('desired', this.value)" class="w-full bg-[#18110b] border border-stone-700 focus:border-[#ee914f] rounded-xl px-3 py-2.5 text-center font-mono-gaming font-black text-lg text-[#fcefc2] outline-none">
                <span class="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#ee914f] font-bold uppercase pointer-events-none">Lvl</span>
              </div>
            </div>
          </div>

          <!-- Dual Range Slider Track -->
          <div class="mt-4 px-1">
            <div class="dual-slider-wrap">
              <div class="dual-slider-track"></div>
              <div id="sp-dual-slider-highlight" class="dual-slider-highlight"></div>
              <input type="range" id="sp-slider-min" min="1" max="90" value="${this.levelCurrent}" oninput="app.onLevelSliderInput('current', this.value)" class="dual-slider-input">
              <input type="range" id="sp-slider-max" min="1" max="90" value="${this.levelDesired}" oninput="app.onLevelSliderInput('desired', this.value)" class="dual-slider-input">
            </div>

            <!-- Tick Marks (1 to 90) -->
            <div class="flex items-center justify-between text-[11px] font-mono-gaming text-stone-400 mt-1 px-1">
              ${[1, 10, 20, 30, 40, 50, 60, 70, 80, 90].map(tk => `
                <button type="button" onclick="app.onTickClick(${tk})" id="level-tick-${tk}" class="level-tick-mark text-stone-400 hover:text-[#ee914f] transition-colors cursor-pointer">
                  ${tk}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Quick Route Presets -->
          <div class="mt-4 pt-3 border-t border-stone-800/80">
            <span class="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-2">Rutas Rápidas Populares:</span>
            <div class="flex flex-wrap gap-1.5" id="level-preset-buttons">
              <button type="button" onclick="app.setLevelRange(1, 80)" class="level-preset-chip px-2.5 py-1 rounded-lg bg-[#1a120b] border border-stone-800 text-[11px] text-stone-300 font-semibold flex items-center gap-1 cursor-pointer">
                <span>1 - 80</span> <span class="text-[9px] text-[#ee914f] font-bold">(Completo)</span>
              </button>
              <button type="button" onclick="app.setLevelRange(70, 80)" class="level-preset-chip px-2.5 py-1 rounded-lg bg-[#1a120b] border border-stone-800 text-[11px] text-stone-300 font-semibold flex items-center gap-1 cursor-pointer">
                <span>70 - 80</span> <span class="text-[9px] text-emerald-400 font-bold">(TWW)</span>
              </button>
              <button type="button" onclick="app.setLevelRange(1, 70)" class="level-preset-chip px-2.5 py-1 rounded-lg bg-[#1a120b] border border-stone-800 text-[11px] text-stone-300 font-semibold flex items-center gap-1 cursor-pointer">
                <span>1 - 70</span> <span class="text-[9px] text-stone-400 font-bold">(Previo)</span>
              </button>
              <button type="button" onclick="app.setLevelRange(60, 80)" class="level-preset-chip px-2.5 py-1 rounded-lg bg-[#1a120b] border border-stone-800 text-[11px] text-stone-300 font-semibold flex items-center gap-1 cursor-pointer">
                <span>60 - 80</span> <span class="text-[9px] text-amber-400 font-bold">(Rápido)</span>
              </button>
              <button type="button" onclick="app.setLevelRange(80, 90)" class="level-preset-chip px-2.5 py-1 rounded-lg bg-[#1a120b] border border-stone-800 text-[11px] text-stone-300 font-semibold flex items-center gap-1 cursor-pointer">
                <span>80 - 90</span> <span class="text-[9px] text-purple-400 font-bold">(Midnight)</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Completion Methods -->
        <div>
          <label class="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-2">
            Método de Completado (Completion Methods):
          </label>
          <div class="space-y-2">
            ${completionMethods.map((m, idx) => `
              <label class="flex items-center justify-between p-3 rounded-xl bg-[#18110b] border border-stone-800 hover:border-stone-700 cursor-pointer transition-colors">
                <div class="flex items-center gap-3 text-xs text-stone-200">
                  <input type="radio" name="sp_mode" value="${m.label}" data-price="${m.price || 0}" ${idx === 0 ? 'checked' : ''} onchange="app.recalculateSingleProductTotal()" class="w-4 h-4 accent-[#ee914f]">
                  <span class="font-semibold">${m.label}</span>
                </div>
                <span class="text-xs ${Number(m.price) > 0 ? 'text-[#ee914f] font-mono-gaming font-bold' : 'text-emerald-400 font-bold'}">
                  ${m.tag || (Number(m.price) > 0 ? '+$' + Number(m.price).toFixed(2) : 'Incluido')}
                </span>
              </label>
            `).join('')}
          </div>
        </div>

        <!-- Gearing Options -->
        <div>
          <label class="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>Opciones de Equipamiento (Gearing options):</span>
            <span class="text-[10px] text-stone-500">Opcional</span>
          </label>
          <select id="sp-gearing-select" onchange="app.recalculateSingleProductTotal()" class="w-full bg-[#18110b] border border-stone-700 rounded-xl px-4 py-3 text-xs text-stone-200 outline-none focus:border-[#ee914f] font-semibold">
            ${gearingOptions.map(g => `
              <option value="${g.price}" data-label="${g.label}">
                ${g.label}
              </option>
            `).join('')}
          </select>
        </div>

        <!-- Additional Options -->
        <div>
          <label class="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-2">
            Opciones Adicionales (Additional Options):
          </label>
          <div class="space-y-2">
            ${additionalOptions.map(opt => `
              <label class="flex items-center justify-between p-3 rounded-xl bg-[#18110b] border border-stone-800 hover:border-stone-700 cursor-pointer transition-colors">
                <div class="flex items-center gap-2.5 text-xs text-stone-200">
                  <input type="checkbox" name="sp_extra_option" data-label="${opt.label}" data-price="${opt.price || 0}" onchange="app.recalculateSingleProductTotal()" class="w-4 h-4 accent-[#ee914f] rounded">
                  <span>${opt.label}</span>
                </div>
                <span class="text-xs text-[#ee914f] font-mono-gaming font-bold">+$${Number(opt.price).toFixed(2)}</span>
              </label>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    setTimeout(() => {
      this.updateLevelSliderUI();
    }, 10);
  }

  setLevelRange(curr, des) {
    curr = Math.max(this.levelMin || 1, Math.min((this.levelMax || 90) - 1, Number(curr)));
    des = Math.max(curr + 1, Math.min(this.levelMax || 90, Number(des)));
    this.levelCurrent = curr;
    this.levelDesired = des;
    this.updateLevelSliderUI();
    this.recalculateSingleProductTotal();
  }

  onLevelSliderInput(type, val) {
    val = Number(val);
    if (type === 'current') {
      if (val >= this.levelDesired) {
        val = this.levelDesired - 1;
      }
      this.levelCurrent = Math.max(this.levelMin || 1, val);
    } else {
      if (val <= this.levelCurrent) {
        val = this.levelCurrent + 1;
      }
      this.levelDesired = Math.min(this.levelMax || 90, val);
    }
    this.updateLevelSliderUI();
    this.recalculateSingleProductTotal();
  }

  onLevelNumberInput(type, val) {
    val = Number(val);
    if (isNaN(val)) return;
    if (type === 'current') {
      val = Math.max(this.levelMin || 1, Math.min((this.levelMax || 90) - 1, val));
      if (val >= this.levelDesired) {
        this.levelDesired = Math.min(this.levelMax || 90, val + 1);
      }
      this.levelCurrent = val;
    } else {
      val = Math.max((this.levelMin || 1) + 1, Math.min(this.levelMax || 90, val));
      if (val <= this.levelCurrent) {
        this.levelCurrent = Math.max(this.levelMin || 1, val - 1);
      }
      this.levelDesired = val;
    }
    this.updateLevelSliderUI();
    this.recalculateSingleProductTotal();
  }

  onTickClick(val) {
    val = Number(val);
    if (val > this.levelCurrent) {
      this.levelDesired = val;
    } else if (val < this.levelDesired) {
      this.levelCurrent = val;
    } else {
      this.levelCurrent = Math.max(this.levelMin || 1, val - 10);
      this.levelDesired = val;
    }
    this.updateLevelSliderUI();
    this.recalculateSingleProductTotal();
  }

  updateLevelSliderUI() {
    const currInput = document.getElementById('sp-level-current');
    const desInput = document.getElementById('sp-level-desired');
    const minSlider = document.getElementById('sp-slider-min');
    const maxSlider = document.getElementById('sp-slider-max');
    const highlight = document.getElementById('sp-dual-slider-highlight');

    if (currInput) currInput.value = this.levelCurrent;
    if (desInput) desInput.value = this.levelDesired;
    if (minSlider) minSlider.value = this.levelCurrent;
    if (maxSlider) maxSlider.value = this.levelDesired;

    if (highlight) {
      const min = this.levelMin || 1;
      const max = this.levelMax || 90;
      const totalSpan = max - min;
      const leftPct = ((this.levelCurrent - min) / totalSpan) * 100;
      const widthPct = ((this.levelDesired - this.levelCurrent) / totalSpan) * 100;
      highlight.style.left = `${Math.max(0, leftPct)}%`;
      highlight.style.width = `${Math.min(100 - leftPct, widthPct)}%`;
    }

    // Highlight active ticks
    const ticks = [1, 10, 20, 30, 40, 50, 60, 70, 80, 90];
    ticks.forEach(t => {
      const el = document.getElementById(`level-tick-${t}`);
      if (el) {
        if (t >= this.levelCurrent && t <= this.levelDesired) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      }
    });

    // Update preset chips active class
    const chips = document.querySelectorAll('.level-preset-chip');
    chips.forEach(chip => {
      const text = chip.textContent || '';
      if (text.includes(`${this.levelCurrent} - ${this.levelDesired}`)) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });
  }

  calculateLevelBasePrice(curr, des) {
    if (des <= curr) return 8.00;
    let price = 0;
    for (let lvl = curr; lvl < des; lvl++) {
      if (lvl < 70) {
        price += 0.35; // 1 to 70: $0.35/lvl
      } else if (lvl < 80) {
        price += 2.50; // 70 to 80: $2.50/lvl (10 lvls = $25.00)
      } else {
        price += 1.60; // 80 to 90: $1.60/lvl (10 lvls = $16.00)
      }
    }
    return Math.max(8.00, Math.round(price * 100) / 100);
  }

  updateSpRunsQty(delta) {
    this.currentRunsQuantity = Math.max(1, this.currentRunsQuantity + delta);
    const qtyEl = document.getElementById('sp-runs-qty');
    if (qtyEl) qtyEl.textContent = this.currentRunsQuantity;
    
    const isLeveling = (this.currentProduct?.id === 'powerleveling-80' || this.currentProduct?.category === 'Powerleveling');
    const unitNoun = isLeveling ? 'personaje' : 'run';
    const unitNounPlural = isLeveling ? 'personajes' : 'runs';

    // Update discount hint banner
    const volDisc = this.currentProduct?.options?.volumeDiscount !== undefined 
      ? Number(this.currentProduct.options.volumeDiscount) 
      : 5;
    const hintEl = document.getElementById('sp-discount-hint');
    if (hintEl) {
      if (this.currentRunsQuantity === 1) {
        hintEl.textContent = `Añade 1 ${unitNoun} más para ${volDisc}% de descuento`;
      } else {
        hintEl.textContent = `¡${this.currentRunsQuantity} ${unitNounPlural} seleccionados! ${volDisc}% de descuento por volumen aplicado.`;
      }
    }

    this.recalculateSingleProductTotal();
  }

  applyPromoCode() {
    const input = document.getElementById('sp-promo-code-input');
    const val = input ? input.value.trim().toUpperCase() : '';
    if (val === 'MYTHIC5' || val === 'PRO5') {
      this.currentPromoDiscount = 0.05; // 5%
      this.showToast('¡Código aplicado! 5% de descuento extra en tu total.', 'success');
    } else if (val === 'MYTHIC10') {
      this.currentPromoDiscount = 0.10; // 10%
      this.showToast('¡Código aplicado! 10% de descuento extra en tu total.', 'success');
    } else {
      this.showToast('Código no válido o expirado.', 'error');
      this.currentPromoDiscount = 0;
    }
    this.recalculateSingleProductTotal();
  }

  recalculateSingleProductTotal() {
    const isLeveling = (this.currentProduct?.id === 'powerleveling-80' || this.currentProduct?.category === 'Powerleveling');
    let unit = 0;

    if (isLeveling) {
      unit = this.calculateLevelBasePrice(this.levelCurrent || 1, this.levelDesired || 80);

      // Gearing options dropdown
      const gearingSelect = document.getElementById('sp-gearing-select');
      if (gearingSelect) {
        unit += Number(gearingSelect.value || 0);
      }
    } else {
      unit = this.currentSpKeyPrice || this.currentProduct?.basePrice || 38.00;

      // Loot-traders extra
      const traderInput = document.querySelector('input[name="sp_traders"]:checked');
      if (traderInput) unit += Number(traderInput.value || 0);

      // Timer extra
      const timerInput = document.getElementById('sp-opt-timer');
      if (timerInput && timerInput.checked) unit += Number(timerInput.dataset.price || 0);
    }

    // Completion method extra
    const modeInput = document.querySelector('input[name="sp_mode"]:checked');
    if (modeInput) unit += Number(modeInput.dataset.price || 0);

    // Extras / Additional options checkboxes
    const extraCheckboxes = document.querySelectorAll('input[name="sp_extra_option"]:checked');
    extraCheckboxes.forEach(cb => {
      unit += Number(cb.dataset.price || 0);
    });

    unit = Math.max(0, Number(unit) || 0);
    let subtotal = unit * (this.currentRunsQuantity || 1);

    // Volume discount
    const volDiscountPct = this.currentProduct?.options?.volumeDiscount !== undefined 
      ? Number(this.currentProduct.options.volumeDiscount) 
      : 5;
    if (this.currentRunsQuantity >= 2 && volDiscountPct > 0) {
      subtotal = subtotal * (1 - (volDiscountPct / 100));
    }

    // Promo code discount
    if (this.currentPromoDiscount > 0) {
      subtotal = subtotal * (1 - this.currentPromoDiscount);
    }

    subtotal = Math.max(0, Math.round((Number(subtotal) || unit) * 100) / 100);

    this.currentUnitCalcPrice = unit;
    this.currentTotalCalculated = subtotal;

    const totalEl = document.getElementById('sp-sticky-total');
    if (totalEl) totalEl.textContent = `$${subtotal.toFixed(2)}`;

    const cashbackPct = this.currentProduct?.options?.cashbackPercent !== undefined 
      ? Number(this.currentProduct.options.cashbackPercent) 
      : 5;
    const cashbackEl = document.getElementById('sp-cashback-text');
    if (cashbackEl) {
      const cashback = (subtotal * (cashbackPct / 100)).toFixed(2);
      cashbackEl.textContent = `+$${cashback} de cashback tras la compra`;
    }
  }

  addCurrentSingleProductToCart() {
    const svc = this.currentProduct || this.services[0];
    const isLeveling = (svc.id === 'powerleveling-80' || svc.category === 'Powerleveling');
    const char = document.getElementById('sp-character')?.value.trim() 
              || `${document.getElementById('sp-char-name')?.value.trim() || 'Heroe'}-${document.getElementById('sp-realm-search')?.value.trim() || 'Ragnaros'}`;
    const region = document.getElementById('sp-region')?.value || this.selectedRealm?.region || 'US';
    const selectedMode = document.querySelector('input[name="sp_mode"]:checked')?.value || 'Piloted (VPN)';

    const calcUnit = Math.max(0, Number(this.currentUnitCalcPrice !== undefined ? this.currentUnitCalcPrice : (this.currentProduct?.basePrice || 38.00)) || 0);
    const runsQty = Math.max(1, Number(this.currentRunsQuantity || 1));
    const calcTotal = Math.max(0, Number(this.currentTotalCalculated !== undefined ? this.currentTotalCalculated : (calcUnit * runsQty)) || (calcUnit * runsQty));

    if (isLeveling) {
      const gearSelect = document.getElementById('sp-gearing-select');
      const gearLabel = gearSelect ? (gearSelect.options[gearSelect.selectedIndex]?.dataset.label || gearSelect.options[gearSelect.selectedIndex]?.text) : 'Not Required';
      const extraLabels = Array.from(document.querySelectorAll('input[name="sp_extra_option"]:checked')).map(cb => cb.dataset.label || cb.closest('label')?.querySelector('span')?.textContent?.trim()).filter(Boolean);

      let detailsParts = [
        `Nivel: ${this.levelCurrent || 1} - ${this.levelDesired || 80}`,
        `Método: ${selectedMode}`,
        `Región: ${region}`,
        `Equipo: ${gearLabel}`
      ];
      if (extraLabels.length > 0) detailsParts.push('Extras: ' + extraLabels.join(', '));
      detailsParts.push(`Personaje: ${char}`);

      const item = {
        cartId: 'item_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        serviceId: svc.id,
        serviceName: `WoW Powerleveling (${this.levelCurrent || 1} - ${this.levelDesired || 80})`,
        category: svc.category,
        unitPrice: calcUnit,
        price: calcUnit,
        quantity: runsQty,
        totalPrice: calcTotal,
        character: char,
        mode: selectedMode,
        region: region,
        levelCurrent: this.levelCurrent || 1,
        levelDesired: this.levelDesired || 80,
        gearing: gearLabel,
        details: detailsParts.join(' | '),
        referredBooster: sessionStorage.getItem('mp_upsell_booster') || null
      };

      this.addToCart(item, true); // Opens cart drawer
      this.showToast(`¡Powerleveling (${item.levelCurrent} - ${item.levelDesired}) añadido al carrito!`, 'success');
      return;
    }

    // Default for M+ and PvE
    const dungeon = document.getElementById('sp-dungeon-select')?.value || 'Random Dungeon';
    const keySelect = document.getElementById('sp-key-level');
    const selectedKeyText = keySelect ? (keySelect.options[keySelect.selectedIndex]?.text || '') : '';
    const traderRadio = document.querySelector('input[name="sp_traders"]:checked');
    const traderLabel = traderRadio ? traderRadio.closest('label')?.querySelector('span')?.textContent?.trim() : '';
    const extraLabels = Array.from(document.querySelectorAll('input[name="sp_extra_option"]:checked')).map(cb => cb.closest('label')?.querySelector('span')?.textContent?.trim()).filter(Boolean);

    let detailsParts = [selectedMode, region, dungeon];
    if (selectedKeyText) detailsParts.unshift(selectedKeyText.split('(')[0].trim());
    if (traderLabel) detailsParts.push(traderLabel);
    if (extraLabels.length > 0) detailsParts.push('Extras: ' + extraLabels.join(', '));
    detailsParts.push(`Personaje: ${char}`);

    const item = {
      cartId: 'item_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      serviceId: svc.id,
      serviceName: `${svc.name} (${dungeon})`,
      category: svc.category,
      unitPrice: calcUnit,
      price: calcUnit,
      quantity: runsQty,
      totalPrice: calcTotal,
      character: char,
      mode: selectedMode,
      region: region,
      details: detailsParts.join(' | '),
      referredBooster: sessionStorage.getItem('mp_upsell_booster') || null
    };

    this.addToCart(item, true); // Opens cart drawer
    this.showToast(`¡${item.serviceName} añadido al carrito!`, 'success');
  }

  buyCurrentSingleProductNow() {
    this.addCurrentSingleProductToCart();
    // Prompt instant checkout
    setTimeout(() => {
      this.processFullCartCheckout();
    }, 600);
  }

// STOREFRONT & CATEGORY PAGES (Req 5)
  // ==========================================
  initStoreFront() {
    this.renderServiceCards();
    this.updateCartCounter();
    this.checkBoosterUpsellReferral();
  }

  initCategoryPage(categoryName) {
    this.currentCategoryFilter = categoryName;
    const container = document.getElementById('category-services-grid');
    if (!container) return;

    const filtered = this.services.filter(s => s.category.toLowerCase().includes(categoryName.toLowerCase()));
    container.innerHTML = filtered.map(svc => this.buildServiceCardHtml(svc)).join('');
    this.updateCartCounter();
    this.checkBoosterUpsellReferral();
  }

  buildServiceCardHtml(svc) {
    const isBoosterSession = this.currentUser && (this.currentUser.type === 'booster' || this.isBooster());
    return `
      <div class="glass-panel rounded-2xl p-6 transition-all duration-300 hover:border-[#ee914f]/60 hover:-translate-y-1 group flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-4">
            <span class="px-3 py-1 text-xs font-semibold rounded-full bg-[#271d15] text-[#ee914f] border border-[#ee914f]/30">
              ${svc.category}
            </span>
            <span class="text-xs text-[#fcefc2] bg-[#1d1611] px-2.5 py-0.5 rounded-full border border-stone-800">
              ${svc.badge}
            </span>
          </div>

          <div class="flex items-start gap-4 mb-4">
            <div class="w-12 h-12 rounded-xl bg-[#221a14] border border-[#ee914f]/30 flex items-center justify-center text-[#ee914f] text-xl group-hover:scale-110 transition-transform">
              <i class="fa-solid ${svc.icon}"></i>
            </div>
            <div>
              <h3 class="text-lg font-bold text-white group-hover:text-[#fcefc2] transition-colors notranslate product-card-title" translate="no">${svc.name}</h3>
              <p class="text-xs text-stone-400 line-clamp-2 mt-1 leading-relaxed">${svc.description}</p>
            </div>
          </div>

          ${isBoosterSession ? `
            <div class="mb-3 p-2.5 rounded-xl bg-[#251b14] border border-[#ee914f]/40 text-xs text-[#fcefc2] flex items-center justify-between">
              <span><i class="fa-solid fa-gem text-[#ee914f] mr-1"></i>Gana 50% extra:</span>
              <button onclick="app.copyBoosterUpsellLink('${svc.id}')" class="px-2 py-1 rounded bg-[#17120e] text-[11px] font-bold text-[#ee914f] hover:text-white border border-[#ee914f]/30">
                Copiar Enlace Pro (50%)
              </button>
            </div>
          ` : ''}
        </div>

        <div class="pt-4 border-t border-stone-800/80 flex items-center justify-between mt-4">
          <div>
            <span class="text-[10px] text-stone-400 uppercase font-bold tracking-wider block">Desde</span>
            <div class="text-2xl font-bold font-mono-gaming text-[#fcefc2]">$${svc.basePrice.toFixed(2)}</div>
          </div>
          <a href="product?id=${svc.id}" class="px-5 py-2.5 rounded-xl copper-gradient-bg font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:opacity-95 transition-all shadow-md">
            <span>Configurar</span>
            <i class="fa-solid fa-arrow-right text-[10px]"></i>
          </a>
        </div>
      </div>
    `;
  }

  renderServiceCards() {
    const container = document.getElementById('services-grid');
    if (!container) return;
    container.innerHTML = this.services.map(svc => this.buildServiceCardHtml(svc)).join('');
  }

  renderRelatedProducts(currentSvc) {
    const container = document.getElementById('sp-related-products');
    if (!container) return;
    const others = (this.services || []).filter(s => s.id !== currentSvc?.id).slice(0, 3);
    container.innerHTML = others.map(s => `
      <div class="glass-panel p-5 rounded-2xl border border-stone-800 hover:border-[#ee914f]/50 transition-all flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-[10px] font-bold text-[#ee914f] bg-[#22160f] px-2 py-0.5 rounded-md border border-[#ee914f]/20">${s.category}</span>
            <span class="text-xs font-mono-gaming font-bold text-[#fcefc2]">$${s.basePrice.toFixed(2)}</span>
          </div>
          <h4 class="font-bold text-white text-sm mb-1">${s.name}</h4>
          <p class="text-[11px] text-stone-400 line-clamp-2 leading-relaxed">${s.description}</p>
        </div>
        <div class="pt-3 mt-3 border-t border-stone-800/60 flex justify-end">
          <a href="product?id=${s.id}" class="text-xs font-bold text-[#ee914f] hover:underline flex items-center gap-1">
            <span>Ver servicio</span>
            <i class="fa-solid fa-arrow-right text-[10px]"></i>
          </a>
        </div>
      </div>
    `).join('');
  }

  openServiceModal(serviceId) {
    const svc = this.services.find(s => s.id === serviceId);
    if (!svc) return;

    const modal = document.getElementById('service-modal');
    const content = document.getElementById('service-modal-content');
    if (!modal || !content) return;

    let optionsHtml = '';
    
    if (svc.id === 'mplus-keystone') {
      optionsHtml = `
        <div class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-stone-300 mb-2">Nivel de Piedra Angular (Keystone):</label>
            <div class="grid grid-cols-4 gap-2">
              ${svc.options.keyLevels.map((k, i) => `
                <button type="button" onclick="app.updateKeystoneLevel(${k.level}, ${k.price})" class="key-level-btn p-2.5 rounded-xl border text-center transition-all ${i===4 ? 'bg-[#ee914f]/20 border-[#ee914f] text-[#fcefc2]' : 'bg-[#18120d] border-stone-800 text-stone-300 hover:border-stone-700'}" data-level="${k.level}">
                  <div class="font-mono-gaming text-lg font-bold">+${k.level}</div>
                  <div class="text-[11px] text-stone-400">$${k.price.toFixed(2)}</div>
                </button>
              `).join('')}
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-stone-300 mb-2">Mazmorra específica:</label>
            <select id="cfg-dungeon" class="w-full bg-[#17120e] border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-200 focus:border-[#ee914f] outline-none">
              ${svc.options.dungeons.map(d => `<option value="${d}">${d}</option>`).join('')}
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-stone-300 mb-2">Modo de juego:</label>
              <select id="cfg-mode" onchange="app.recalculateModalPrice()" class="w-full bg-[#17120e] border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-200">
                <option value="Self-Play">Self-Play (Juegas tú)</option>
                <option value="Piloted">Piloted (Juega un pro)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-stone-300 mb-2">Traders de armadura:</label>
              <select id="cfg-traders" onchange="app.recalculateModalPrice()" class="w-full bg-[#17120e] border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-200">
                <option value="0" data-extra="0">Sin traders (+0$)</option>
                <option value="1" data-extra="10">1 Trader (+10$)</option>
                <option value="2" data-extra="18">2 Traders (+18$)</option>
                <option value="3" data-extra="25">3 Traders (+25$)</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-stone-300 mb-1">Región:</label>
              <select id="cfg-region" class="w-full bg-[#17120e] border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-200">
                <option value="US">América (US)</option>
                <option value="EU">Europa (EU)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-stone-300 mb-1">Reino y Personaje:</label>
              <input id="cfg-character" type="text" placeholder="Ej: Shadowblade-Ragnaros" class="w-full bg-[#17120e] border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-200 outline-none focus:border-[#ee914f]" required>
            </div>
          </div>
        </div>
      `;
    } else {
      optionsHtml = `
        <div class="space-y-4">
          <p class="text-sm text-stone-300 leading-relaxed">${svc.description}</p>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-stone-300 mb-1">Modo:</label>
              <select id="cfg-mode" class="w-full bg-[#17120e] border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-200">
                <option value="Self-Play">Self-Play (Tu juegas)</option>
                <option value="Piloted">Piloted (Juega el Pro)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-stone-300 mb-1">Región:</label>
              <select id="cfg-region" class="w-full bg-[#17120e] border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-200">
                <option value="US">US</option>
                <option value="EU">EU</option>
              </select>
            </div>
          </div>
          <div>
            <label class="block text-xs font-semibold text-stone-300 mb-1">Personaje y reino:</label>
            <input id="cfg-character" type="text" placeholder="Personaje-Reino" class="w-full bg-[#17120e] border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-200">
          </div>
        </div>
      `;
    }

    content.innerHTML = `
      <div class="p-6">
        <div class="flex items-center justify-between pb-4 border-b border-stone-800">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-[#221a14] border border-[#ee914f]/40 flex items-center justify-center text-[#ee914f]">
              <i class="fa-solid ${svc.icon}"></i>
            </div>
            <div>
              <h2 class="text-lg font-bold text-[#fcefc2]">${svc.name}</h2>
              <span class="text-xs text-[#ee914f]">${svc.category}</span>
            </div>
          </div>
          <button onclick="app.closeServiceModal()" class="w-8 h-8 rounded-full bg-stone-900 text-stone-400 hover:text-white flex items-center justify-center">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="py-5" id="modal-interactive-body">
          ${optionsHtml}
        </div>

        <div class="pt-4 border-t border-stone-800 flex items-center justify-between">
          <div>
            <span class="text-xs text-stone-400">Total a pagar:</span>
            <div class="text-3xl font-bold font-mono-gaming text-[#fcefc2]" id="modal-total-price">$${svc.basePrice.toFixed(2)}</div>
          </div>
          <button onclick="app.addCurrentConfigToCart('${svc.id}')" class="px-6 py-3 rounded-xl copper-gradient-bg font-bold text-sm uppercase tracking-wider flex items-center gap-2">
            <i class="fa-solid fa-cart-shopping"></i>
            <span>Comprar Servicio</span>
          </button>
        </div>
      </div>
    `;

    this.currentSelectedKeyPrice = 38.00;
    this.currentSelectedKeyLevel = 10;
    this.currentActiveService = svc;
    this.recalculateModalPrice();

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  updateKeystoneLevel(level, price) {
    this.currentSelectedKeyLevel = level;
    this.currentSelectedKeyPrice = price;
    
    document.querySelectorAll('.key-level-btn').forEach(btn => {
      if (Number(btn.dataset.level) === level) {
        btn.classList.add('bg-[#ee914f]/20', 'border-[#ee914f]', 'text-[#fcefc2]');
        btn.classList.remove('bg-[#18120d]', 'border-stone-800', 'text-stone-300');
      } else {
        btn.classList.remove('bg-[#ee914f]/20', 'border-[#ee914f]', 'text-[#fcefc2]');
        btn.classList.add('bg-[#18120d]', 'border-stone-800', 'text-stone-300');
      }
    });

    this.recalculateModalPrice();
  }

  recalculateModalPrice() {
    let total = this.currentActiveService?.basePrice || 25.00;
    if (this.currentActiveService?.id === 'mplus-keystone') {
      total = this.currentSelectedKeyPrice || 38.00;
      const traderElem = document.getElementById('cfg-traders');
      if (traderElem) {
        const extra = Number(traderElem.selectedOptions[0]?.dataset.extra || 0);
        total += extra;
      }
    }
    const priceElem = document.getElementById('modal-total-price');
    if (priceElem) priceElem.textContent = `$${total.toFixed(2)}`;
    this.currentCalculatedModalTotal = total;
  }

  closeServiceModal() {
    const modal = document.getElementById('service-modal');
    if (modal) modal.classList.add('hidden');
  }

  addCurrentConfigToCart(serviceId) {
    const svc = this.currentActiveService;
    const char = document.getElementById('cfg-character')?.value || 'Heroe-Ragnaros';
    const mode = document.getElementById('cfg-mode')?.value || 'Self-Play';
    const region = document.getElementById('cfg-region')?.value || 'US';
    const dungeon = document.getElementById('cfg-dungeon')?.value || 'The Stonevault';
    
    const item = {
      orderId: 'MP-' + Math.floor(10000 + Math.random() * 90000),
      serviceId: svc.id,
      serviceName: svc.name + (svc.id === 'mplus-keystone' ? ` (+${this.currentSelectedKeyLevel} ${dungeon})` : ''),
      category: svc.category,
      price: this.currentCalculatedModalTotal || svc.basePrice,
      character: char,
      mode: mode,
      region: region,
      details: `${mode} | ${region} | Personaje: ${char}`,
      referredBooster: sessionStorage.getItem('mp_upsell_booster') || null
    };

    this.cart.push(item);
    localStorage.setItem('mp_cart', JSON.stringify(this.cart));
    this.updateCartCounter();
    this.closeServiceModal();
    this.showToast(`¡Añadido: ${item.serviceName}!`, 'success');
    this.openCheckoutModal(item);
  }

  updateCartCounter() {
    const badge = document.getElementById('cart-counter');
    if (badge) badge.textContent = this.cart.length;
  }

  openCheckoutModal(orderItem) {
    const modal = document.getElementById('checkout-modal');
    if (!modal) return;

    const finalPrice = Math.max(0, Number(
      orderItem.totalPrice !== undefined && !isNaN(Number(orderItem.totalPrice))
        ? orderItem.totalPrice
        : (orderItem.price !== undefined && !isNaN(Number(orderItem.price)) ? orderItem.price : 0)
    ) || 0);

    const summary = document.getElementById('checkout-summary');
    if (summary) {
      summary.innerHTML = `
        <div class="bg-[#150f0c] p-4 rounded-xl border border-stone-800 space-y-2 mb-4">
          <div class="flex justify-between text-sm">
            <span class="text-stone-400">Servicio:</span>
            <span class="font-bold text-[#fcefc2]">${orderItem.serviceName}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-stone-400">Personaje:</span>
            <span class="text-stone-200">${orderItem.character}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-stone-400">Modalidad:</span>
            <span class="text-[#ee914f]">${orderItem.mode} (${orderItem.region})</span>
          </div>
          <div class="pt-2 border-t border-stone-800 flex justify-between items-center">
            <span class="text-xs text-stone-400">Total a Pagar:</span>
            <span class="text-2xl font-bold font-mono-gaming text-[#fcefc2]">$${finalPrice.toFixed(2)}</span>
          </div>
        </div>
        <div class="text-[11px] text-stone-300 bg-[#251b14] border border-[#ee914f]/30 p-3 rounded-lg flex items-center gap-2">
          <i class="fa-solid fa-shield-halved text-[#ee914f] text-sm"></i>
          <span>Garantía de satisfacción y protección VPN. Tu orden pasará a tu perfil al completar el pago.</span>
        </div>
      `;
    }

    this.currentPendingOrder = orderItem;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  closeCheckoutModal() {
    const modal = document.getElementById('checkout-modal');
    if (modal) modal.classList.add('hidden');
  }

  processCheckoutPayment() {
    const item = this.currentPendingOrder;
    if (!item) return;

    if (!this.currentUser) {
      this.currentUser = {
        id: 'client_carlos',
        username: 'Carlos M.',
        email: 'carlos.wow@gmail.com',
        discordId: 'CarlosWoW#4819',
        type: 'client',
        country: 'Estados Unidos',
        battletag: 'CarlosWoW#1234'
      };
      this.saveUser();
      this.renderHeader();
    }

    const isUpsell = !!item.referredBooster;
    const finalPrice = Math.max(0, Number(
      item.totalPrice !== undefined && !isNaN(Number(item.totalPrice))
        ? item.totalPrice
        : (item.price !== undefined && !isNaN(Number(item.price)) ? item.price : 0)
    ) || 45.00);

    const econ = this.calculateEconomics(finalPrice, isUpsell);
    const charStr = item.character || 'Heroe-Area 52';
    const realmName = (charStr.includes('-')) ? charStr.split('-')[1].trim() : 'Area 52';

    const newOrder = {
      id: item.orderId || ('MP-' + Math.floor(10000 + Math.random() * 90000)),
      serviceName: item.serviceName,
      category: item.category || 'Servicios',
      region: item.region || 'US',
      faction: 'Horda',
      realm: realmName,
      characterName: charStr,
      completionMethod: item.mode || 'Piloted',
      vpnLocation: (item.mode && String(item.mode).toLowerCase().includes('piloted')) ? 'Estados Unidos (Chicago)' : 'N/A (Self-play)',
      details: item.details || '',
      clientId: this.currentUser.id,
      clientEmail: this.currentUser.email,
      clientDiscord: this.currentUser.discordId,
      clientName: this.currentUser.username,
      totalPrice: finalPrice,
      price: finalPrice,
      companyShare: econ.company,
      boosterPayout: econ.booster,
      boosterPayoutRate: econ.boosterRate, // 30% base o 50% upsell
      maxBidAllowed: econ.maxBid,
      status: 'AVAILABLE',
      bids: [],
      assignedBooster: null,
      isOnAccount: false,
      createdAt: new Date().toISOString(),
      chat: []
    };

    // If it was referred by a specific booster, assign or credit them
    if (item.referredBooster) {
      newOrder.referredByBooster = item.referredBooster;
    }

    this.orders.unshift(newOrder);
    this.saveOrders();
    this.cart = this.cart.filter(c => c.orderId !== item.orderId);
    localStorage.setItem('mp_cart', JSON.stringify(this.cart));
    this.updateCartCounter();
    this.closeCheckoutModal();

    this.showToast(`¡Orden #${newOrder.id} creada con éxito! Redirigiendo a tu perfil de cliente...`, 'success');

    // Auto-redirect to client profile after 1 second
    setTimeout(() => {
      window.location.href = 'client-profile';
    }, 1200);
  }

  // ==========================================
  
// CLIENT PROFILE & ORDERS PANEL (Req 1 & 3)
  // ==========================================
  initClientProfile() {
    this.renderClientProfileData();
    this.renderClientOrders();
  }

  renderClientProfileData() {
    const user = this.currentUser || {
      id: 'client_carlos',
      username: 'Carlos M.',
      email: 'carlos.wow@gmail.com',
      country: 'Estados Unidos',
      battletag: 'CarlosWoW#1234',
      discordId: 'CarlosWoW#4819'
    };

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val || '';
    };

    setVal('prof-username', user.username);
    setVal('prof-email', user.email);
    setVal('prof-country', user.country);
    setVal('prof-battletag', user.battletag);
    setVal('prof-discord', user.discordId);

    const nameBadge = document.getElementById('client-profile-header-name');
    if (nameBadge) nameBadge.textContent = user.username;

    // Render linked accounts status widget
    this.renderLinkedAccountsWidget('client-linked-accounts-container');
  }

  setClientOrdersFilter(filter) {
    this.clientOrdersFilter = filter;
    this.renderClientOrders();
  }

  renderClientOrders() {
    const container = document.getElementById('client-orders-list');
    if (!container) return;

    let targetId = this.currentUser?.id;
    let targetEmail = (this.currentUser?.email || '').toLowerCase();
    let targetName = (this.currentUser?.username || '').toLowerCase();
    let targetDiscord = String(this.currentUser?.discordId || this.currentUser?.discord_id || '');

    if (!this.currentUser) {
      targetId = 'client_carlos';
      targetEmail = 'carlos.wow@gmail.com';
      targetName = 'carlos m.';
    }

    // Match all orders placed by this client, plus demo orders
    let allMyOrders = (this.orders || []).filter(o => {
      if (!o) return false;
      const cId = String(o.clientId || '');
      const cEmail = (o.clientEmail || '').toLowerCase();
      const cName = (o.clientName || '').toLowerCase();
      const cDiscord = String(o.clientDiscord || '');

      if (targetId && (cId === String(targetId) || cId.includes(String(targetId)))) return true;
      if (targetEmail && cEmail && cEmail === targetEmail) return true;
      if (targetName && cName && (cName === targetName || cName.includes(targetName))) return true;
      if (targetDiscord && cDiscord && (cDiscord === targetDiscord || cDiscord.includes(targetDiscord))) return true;
      if (cId === 'client_carlos' || cId === 'client_guest') return true;
      return false;
    });

    // Fallback: If logged in as staff/admin and no client orders matched, show all orders
    if (allMyOrders.length === 0 && (this.isAdminOrGerente() || this.currentUser?.isAdmin || this.currentUser?.isStaff)) {
      allMyOrders = this.orders || [];
    }

    // Metrics
    const totalCount = allMyOrders.length;
    const inProgressCount = allMyOrders.filter(o => o.assignedBooster && o.status !== 'COMPLETED').length;
    const pendingBoosterCount = allMyOrders.filter(o => !o.assignedBooster && o.status !== 'COMPLETED').length;
    const completedCount = allMyOrders.filter(o => o.status === 'COMPLETED').length;
    const totalSpent = allMyOrders.reduce((sum, o) => {
      const p = Math.max(0, Number(o.totalPrice !== undefined && !isNaN(Number(o.totalPrice)) ? o.totalPrice : (o.price !== undefined && !isNaN(Number(o.price)) ? o.price : 45.00)) || 45.00);
      return sum + p;
    }, 0);

    const currentFilter = this.clientOrdersFilter || 'ALL';

    // Apply active tab filter
    let filteredOrders = allMyOrders;
    if (currentFilter === 'IN_PROGRESS') {
      filteredOrders = allMyOrders.filter(o => o.assignedBooster && o.status !== 'COMPLETED');
    } else if (currentFilter === 'PENDING_BOOSTER') {
      filteredOrders = allMyOrders.filter(o => !o.assignedBooster && o.status !== 'COMPLETED');
    } else if (currentFilter === 'COMPLETED') {
      filteredOrders = allMyOrders.filter(o => o.status === 'COMPLETED');
    }

    if (totalCount === 0) {
      container.innerHTML = `
        <div class="glass-panel p-10 rounded-2xl text-center border border-stone-800 bg-[#120d09]">
          <i class="fa-solid fa-receipt text-4xl text-[#ee914f]/40 mb-3"></i>
          <h4 class="text-base font-bold text-stone-200 font-cinzel">Aún no tienes pedidos activos</h4>
          <p class="text-xs text-stone-400 max-w-md mx-auto mt-1.5 leading-relaxed">Explora nuestro catálogo para adquirir tu primera piedra angular mítica+, raid completa o subida de nivel profesional con booster asignado.</p>
          <a href="/" class="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-xl copper-gradient-bg text-stone-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-[#ee914f]/20 hover:opacity-95 transition-all">
            <i class="fa-solid fa-store"></i>
            <span>Ver Catálogo de Servicios</span>
          </a>
        </div>
      `;
      return;
    }

    const metricsHtml = `
      <!-- SUMMARY METRICS -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div class="glass-panel p-3.5 rounded-xl border border-stone-800 bg-[#140e0a]">
          <span class="text-[10px] text-stone-400 uppercase font-semibold block">Total Pedidos</span>
          <div class="flex items-center justify-between mt-1">
            <span class="text-xl font-black font-mono-gaming text-[#fcefc2]">${totalCount}</span>
            <i class="fa-solid fa-boxes-stacked text-[#ee914f]/60 text-sm"></i>
          </div>
        </div>
        <div class="glass-panel p-3.5 rounded-xl border border-stone-800 bg-[#140e0a]">
          <span class="text-[10px] text-stone-400 uppercase font-semibold block">En Proceso</span>
          <div class="flex items-center justify-between mt-1">
            <span class="text-xl font-black font-mono-gaming text-sky-400">${inProgressCount}</span>
            <i class="fa-solid fa-gamepad text-sky-400/60 text-sm"></i>
          </div>
        </div>
        <div class="glass-panel p-3.5 rounded-xl border border-stone-800 bg-[#140e0a]">
          <span class="text-[10px] text-stone-400 uppercase font-semibold block">Buscando Booster</span>
          <div class="flex items-center justify-between mt-1">
            <span class="text-xl font-black font-mono-gaming text-amber-400">${pendingBoosterCount}</span>
            <i class="fa-solid fa-hourglass-half text-amber-400/60 text-sm"></i>
          </div>
        </div>
        <div class="glass-panel p-3.5 rounded-xl border border-stone-800 bg-[#140e0a]">
          <span class="text-[10px] text-stone-400 uppercase font-semibold block">Inversión Total</span>
          <div class="flex items-center justify-between mt-1">
            <span class="text-xl font-black font-mono-gaming text-emerald-400">$${totalSpent.toFixed(2)}</span>
            <i class="fa-solid fa-shield-halved text-emerald-400/60 text-sm"></i>
          </div>
        </div>
      </div>

      <!-- FILTER TABS -->
      <div class="flex flex-wrap items-center gap-2 mb-4 border-b border-stone-800/80 pb-3">
        <button onclick="app.setClientOrdersFilter('ALL')" class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${currentFilter === 'ALL' ? 'bg-[#2b1f15] text-[#fcefc2] border border-[#ee914f]/50' : 'bg-[#150f0c] text-stone-400 hover:text-white border border-stone-800'}">
          <span>Todos</span>
          <span class="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-stone-900 border border-stone-700 font-mono-gaming">${totalCount}</span>
        </button>
        <button onclick="app.setClientOrdersFilter('IN_PROGRESS')" class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${currentFilter === 'IN_PROGRESS' ? 'bg-[#2b1f15] text-sky-300 border border-sky-600/50' : 'bg-[#150f0c] text-stone-400 hover:text-white border border-stone-800'}">
          <span>En Proceso</span>
          <span class="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-sky-950/80 border border-sky-800 font-mono-gaming text-sky-300">${inProgressCount}</span>
        </button>
        <button onclick="app.setClientOrdersFilter('PENDING_BOOSTER')" class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${currentFilter === 'PENDING_BOOSTER' ? 'bg-[#2b1f15] text-amber-300 border border-amber-600/50' : 'bg-[#150f0c] text-stone-400 hover:text-white border border-stone-800'}">
          <span>Buscando Booster</span>
          <span class="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-800 font-mono-gaming text-amber-300">${pendingBoosterCount}</span>
        </button>
        <button onclick="app.setClientOrdersFilter('COMPLETED')" class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${currentFilter === 'COMPLETED' ? 'bg-[#2b1f15] text-emerald-300 border border-emerald-600/50' : 'bg-[#150f0c] text-stone-400 hover:text-white border border-stone-800'}">
          <span>Completados</span>
          <span class="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800 font-mono-gaming text-emerald-300">${completedCount}</span>
        </button>
      </div>
    `;

    if (filteredOrders.length === 0) {
      container.innerHTML = metricsHtml + `
        <div class="glass-panel p-8 rounded-2xl text-center border border-stone-800 bg-[#140e0a]">
          <p class="text-xs text-stone-400">No hay pedidos con el filtro seleccionado.</p>
        </div>
      `;
      return;
    }

    const cardsHtml = filteredOrders.map(order => {
      const isAssigned = !!order.assignedBooster;
      let statusText = isAssigned ? 'EN PROCESO' : 'BUSCANDO BOOSTER';
      let statusClass = isAssigned ? 'bg-[#1a2332] text-sky-300 border border-sky-700/50' : 'bg-amber-950/50 text-amber-300 border border-amber-700/50';
      let statusIcon = isAssigned ? 'fa-gamepad' : 'fa-hourglass-half';

      if (order.status === 'COMPLETED') {
        statusText = 'COMPLETADO';
        statusClass = 'bg-[#152319] text-emerald-400 border border-emerald-800/60';
        statusIcon = 'fa-circle-check';
      } else if (order.status === 'PENDING_APPROVAL') {
        statusText = 'REPORTE RECIBIDO (EN REVISIÓN)';
        statusClass = 'bg-amber-950/90 text-amber-300 border border-amber-500/70 animate-pulse';
        statusIcon = 'fa-bell';
      }

      // Safe price calculation that will NEVER result in NaN or throw
      const safeTotal = Math.max(0, Number(
        order.totalPrice !== undefined && !isNaN(Number(order.totalPrice))
          ? order.totalPrice
          : (order.price !== undefined && !isNaN(Number(order.price)) ? order.price : 45.00)
      ) || 45.00);

      const charName = order.characterName || order.character || 'Heroe-Ragnaros';
      const realmName = order.realm || (charName.includes('-') ? charName.split('-')[1].trim() : 'Área 52');
      const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Reciente';

      return `
        <div class="glass-panel p-5 rounded-2xl border border-stone-800 hover:border-[#ee914f]/50 transition-all bg-[#130d09] mb-4 shadow-xl">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            <div class="space-y-2 flex-1">
              <!-- Top Badges Row -->
              <div class="flex items-center gap-2 flex-wrap text-[11px]">
                <span class="font-mono-gaming font-bold text-[#ee914f] bg-[#22170f] px-2.5 py-0.5 rounded-lg border border-[#ee914f]/30">#${order.id}</span>
                <span class="px-2.5 py-0.5 rounded-lg font-bold flex items-center gap-1.5 ${statusClass}">
                  <i class="fa-solid ${statusIcon} text-[10px]"></i>
                  <span>${statusText}</span>
                </span>
                <span class="px-2.5 py-0.5 rounded-lg bg-[#18110b] text-stone-300 border border-stone-800">
                  ${order.category || 'Servicio WoW'}
                </span>
                <span class="px-2.5 py-0.5 rounded-lg bg-[#18110b] text-stone-300 border border-stone-800">
                  ${order.completionMethod || 'Piloted'} (${order.region || 'US'})
                </span>
                <span class="text-stone-500 text-[10px] ml-auto">
                  <i class="fa-regular fa-clock mr-1"></i>${orderDate}
                </span>
              </div>

              <!-- Main Title & Details -->
              <div>
                <h4 class="text-base font-bold text-white hover:text-[#eedaa2] transition-colors leading-snug">${order.serviceName}</h4>
                <div class="flex items-center gap-2 text-xs text-stone-400 mt-1 flex-wrap">
                  <span>Personaje: <strong class="text-stone-200">${charName}</strong></span>
                  <span class="text-stone-600">•</span>
                  <span>Reino: <strong class="text-stone-200">${realmName}</strong></span>
                  ${order.details ? `
                    <span class="text-stone-600">•</span>
                    <span class="text-stone-400 text-[11px] truncate max-w-md italic">${order.details}</span>
                  ` : ''}
                </div>
              </div>

              <!-- Booster Status Box -->
              ${isAssigned ? `
                <div class="inline-flex items-center gap-2.5 bg-[#1b140f] px-3.5 py-1.5 rounded-xl border border-[#ee914f]/30 text-xs mt-1">
                  <div class="w-6 h-6 rounded-full bg-[#2a1d13] border border-[#ee914f]/40 flex items-center justify-center text-[10px] text-[#fcefc2] font-black">
                    ${order.assignedBooster.avatar ? `<img src="${order.assignedBooster.avatar}" class="w-full h-full rounded-full object-cover">` : `<i class="fa-solid fa-gamepad text-[#ee914f]"></i>`}
                  </div>
                  <span class="text-stone-300">Booster asignado: <strong class="text-[#fcefc2]">${order.assignedBooster.username}</strong></span>
                  ${order.isOnAccount ? `
                    <span class="ml-2 text-[10px] bg-red-950 text-red-300 px-2 py-0.5 rounded border border-red-800 font-semibold animate-pulse flex items-center gap-1">
                      <i class="fa-solid fa-lock text-[9px]"></i> En tu cuenta ahora
                    </span>
                  ` : `
                    <span class="ml-2 text-[10px] bg-emerald-950/60 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800/50 flex items-center gap-1">
                      <i class="fa-solid fa-circle text-[6px]"></i> En línea
                    </span>
                  `}
                </div>
              ` : `
                <div class="inline-flex items-center gap-2 bg-[#17110c] px-3 py-1 rounded-xl border border-stone-800 text-xs text-stone-400 mt-1">
                  <i class="fa-solid fa-hourglass-half text-amber-400/80"></i>
                  <span>Tu orden está en el tablón pro. Un booster calificado la tomará en breve.</span>
                </div>
              `}

              <!-- Completion Report Alert -->
              ${order.status === 'PENDING_APPROVAL' ? `
                <div class="mt-3 p-4 rounded-xl bg-amber-950/40 border border-amber-600/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                  <div>
                    <div class="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <i class="fa-solid fa-bell"></i> ¡El booster ha reportado tu orden como completada!
                    </div>
                    <p class="text-[11px] text-stone-300 mt-0.5">
                      ${order.completionReport?.notes ? `<span class="text-stone-400 italic font-mono">"${order.completionReport.notes}"</span><br>` : ''}
                      Por favor verifica tu personaje. Si todo está en orden, confirma para finalizar el servicio y liberar el pago.
                    </p>
                  </div>
                  <button onclick="app.clientConfirmOrderCompletion('${order.id}')" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-all cursor-pointer whitespace-nowrap">
                    <i class="fa-solid fa-check-double"></i> Confirmar y Finalizar
                  </button>
                </div>
              ` : ''}

            </div>

            <!-- Right Column: Price & Chat Button -->
            <div class="flex items-center md:flex-col md:items-end justify-between md:justify-center gap-3 border-t md:border-t-0 pt-3 md:pt-0 border-stone-800/80 shrink-0">
              <div class="text-left md:text-right">
                <span class="text-[10px] text-stone-400 block uppercase font-semibold">Total Pagado</span>
                <span class="text-2xl font-black font-mono-gaming text-[#fcefc2]">$${safeTotal.toFixed(2)}</span>
              </div>
              <button onclick="app.openClientFullChat('${order.id}')" class="px-4 py-2.5 rounded-xl bg-[#221a14] hover:bg-[#2d221a] text-[#fcefc2] border border-[#ee914f]/40 font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-md hover:border-[#ee914f]">
                <i class="fa-solid fa-comments text-[#ee914f]"></i>
                <span>Chat con el Booster</span>
              </button>
            </div>

          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = metricsHtml + cardsHtml;
  }

  clientConfirmOrderCompletion(orderId) {
    const o = this.orders.find(x => x.id === orderId);
    if (!o) return;
    if (confirm(`¿Confirmas que recibiste el servicio #${orderId} a entera satisfacción?\n\nAl confirmar, se liberará el pago al booster y la orden quedará cerrada.`)) {
      this.finalizeOrderCompletion(orderId, 'Cliente');
      this.renderClientOrders();
      this.showToast(`¡Servicio confirmado! Gracias por confiar en Mythic Progression.`, 'success');
    }
  }

  openClientChat(orderId) {
    this.activeChatOrderId = orderId;
    const order = this.orders.find(o => o.id === orderId);
    if (!order) return;

    // Strict Chat Privacy check (Req 4)
    if (!this.canAccessOrderChat(order)) {
      this.showToast('No tienes permiso para ver el chat de esta orden.', 'error');
      return;
    }

    const modal = document.getElementById('client-chat-modal');
    if (!modal) return;

    this.renderClientChatMessages(order);
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  canAccessOrderChat(order) {
    if (!this.currentUser) {
      return order.clientId === 'client_carlos' || order.clientId === 'client_guest' || !order.clientId;
    }
    // Staff & Admin always have access
    if (this.currentUser.type === 'staff' || this.currentUser.type === 'admin' || this.isAdminOrGerente()) return true;
    // Order's client has access
    if (order.clientId === this.currentUser.id || order.clientEmail === this.currentUser.email || order.clientName === this.currentUser.username || order.clientId === 'client_carlos' || order.clientId === 'client_guest') return true;
    // Order's assigned booster has access
    if (order.assignedBooster) {
      if (this.currentUser.discordId && order.assignedBooster.discordId && String(this.currentUser.discordId) === String(order.assignedBooster.discordId)) return true;
      if (this.currentUser.username && order.assignedBooster.username && this.currentUser.username.trim().toLowerCase() === order.assignedBooster.username.trim().toLowerCase()) return true;
      if (this.currentUser.id && order.assignedBooster.id && String(this.currentUser.id) === String(order.assignedBooster.id)) return true;
    }
    return false;
  }

  renderClientChatMessages(order) {
    const titleElem = document.getElementById('client-chat-order-title');
    if (titleElem) titleElem.textContent = `Orden #${order.id} - ${order.serviceName}`;

    const boosterNameElem = document.getElementById('client-chat-booster-name');
    if (boosterNameElem) {
      boosterNameElem.textContent = order.assignedBooster ? order.assignedBooster.username : 'Esperando asignación...';
    }

    const stream = document.getElementById('client-chat-stream');
    if (!stream) return;

    stream.innerHTML = (order.chat || []).map(msg => {
      if (msg.sender === 'system') {
        return `
          <div class="flex flex-col items-center mb-3">
            <span class="text-[11px] bg-[#1a140f] border border-[#ee914f]/30 text-[#fcefc2] px-3.5 py-1 rounded-full text-center">
              ${msg.message}
            </span>
          </div>
        `;
      }
      const info = this.formatChatAuthorDisplay(msg);
      const isClientMsg = info.roleLabel === 'Cliente' || msg.sender === 'client';
      return `
        <div class="flex flex-col ${isClientMsg ? 'items-end' : 'items-start'} mb-3">
          <div class="max-w-[80%] p-3.5 rounded-2xl text-xs ${info.bubbleClass} ${isClientMsg ? 'rounded-br-none' : 'rounded-bl-none'}">
            <div class="text-[10px] mb-1 font-semibold flex items-center gap-1.5" style="color: ${info.authorColor}">
              <span>${info.cleanName}</span>
              ${info.badgeHtml}
            </div>
            <div class="leading-relaxed break-words">${msg.message}</div>
          </div>
          <span class="text-[9px] text-stone-500 mt-1">${new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
      `;
    }).join('');

    setTimeout(() => {
      stream.scrollTop = stream.scrollHeight;
    }, 50);
  }

  sendClientChatMessage() {
    const input = document.getElementById('client-chat-input');
    if (!input || !input.value.trim() || !this.activeChatOrderId) return;

    const order = this.orders.find(o => o.id === this.activeChatOrderId);
    if (!order) return;

    order.chat = order.chat || [];
    order.chat.push({
      sender: 'client',
      author: `${this.currentUser?.username || 'Cliente'} (Cliente)`,
      message: input.value.trim(),
      timestamp: new Date().toISOString()
    });

    this.saveOrders();
    input.value = '';
    this.renderClientChatMessages(order);
  }

  closeClientChat() {
    const modal = document.getElementById('client-chat-modal');
    if (modal) modal.classList.add('hidden');
  }

  // ==========================================
  

  // ==========================================
  // CLIENT FULL SCREEN CHAT (EXACT BOOSTER LAYOUT)
  // ==========================================
  renderClientChatsList() {
    const container = document.getElementById('client-chats-list');
    if (!container) return;

    let targetId = this.currentUser?.id;
    let targetEmail = this.currentUser?.email;
    let targetName = this.currentUser?.username;
    if (!this.currentUser) {
      targetId = 'client_carlos';
      targetEmail = 'carlos.wow@gmail.com';
      targetName = 'Carlos M.';
    }

    const myOrders = this.orders.filter(o => 
      (targetId && o.clientId === targetId) || 
      (targetEmail && o.clientEmail === targetEmail) ||
      (targetName && o.clientName === targetName) ||
      (o.clientId === 'client_carlos') ||
      (o.clientId === 'client_guest')
    );

    const badge = document.getElementById('client-chat-badge-count');
    if (badge) badge.textContent = myOrders.length;

    if (myOrders.length === 0) {
      container.innerHTML = '<div class="p-4 text-xs text-stone-500 text-center">No tienes pedidos activos.</div>';
      return;
    }

    container.innerHTML = myOrders.map(order => {
      const isSelected = this.activeClientChatOrderId === order.id;
      const lastMsg = (order.chat && order.chat.length > 0) ? order.chat[order.chat.length - 1].message : 'Chat iniciado. Coordina con tu booster.';
      const boosterName = order.assignedBooster ? order.assignedBooster.username : 'Buscando Booster';

      return `
        <div onclick="app.openClientFullChat('${order.id}')" class="p-3 rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-[#2a1d13] border border-[#ee914f]/50' : 'bg-[#18120d] border border-stone-800 hover:border-stone-700'}">
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs font-bold text-white truncate max-w-[120px]">${boosterName}</span>
            <span class="text-[10px] font-mono-gaming text-[#ee914f]">#${order.id}</span>
          </div>
          <div class="text-[11px] text-[#eedaa2] font-semibold truncate mb-1">${order.serviceName}</div>
          <p class="text-[10px] text-stone-400 line-clamp-1 italic">${lastMsg}</p>
        </div>
      `;
    }).join('');
  }

  openClientFullChat(orderId) {
    this.activeClientChatOrderId = orderId;
    
    // Switch tab to chat view
    if (typeof switchClientTab === 'function') {
      switchClientTab('chat');
    }

    const order = this.orders.find(o => o.id === orderId);
    if (!order) return;

    // Strict Privacy check
    if (!this.canAccessOrderChat(order)) {
      this.showToast('No tienes acceso a este pedido.', 'error');
      return;
    }

    this.renderClientChatsList();

    const container = document.getElementById('client-active-chat-container');
    if (!container) return;

    const boosterName = order.assignedBooster ? order.assignedBooster.username : 'Buscando Booster';

    container.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-12 gap-4 h-[620px]">
        
        <!-- Active Chat Stream (md:col-span-8) -->
        <div class="md:col-span-8 glass-panel rounded-2xl border border-stone-800 p-4 flex flex-col bg-[#110d09]">
          
          <!-- Header with Booster Name & Online status -->
          <div class="flex items-center justify-between pb-3 border-b border-stone-800">
            <div>
              <h4 class="text-sm font-bold text-white flex items-center gap-2">
                <span>${boosterName}</span>
                <span class="text-xs text-[#eedaa2] font-normal">(${order.assignedBooster ? 'Booster Asignado' : 'Asignación Pendiente'})</span>
              </h4>
              <span class="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                <i class="fa-solid fa-circle text-[7px]"></i>
                <span>En línea para orden #${order.id}</span>
              </span>
            </div>
            ${order.isOnAccount ? `
              <span class="px-2.5 py-1 rounded-lg bg-red-950/80 text-red-300 border border-red-700/60 text-[10px] font-bold flex items-center gap-1 animate-pulse">
                <i class="fa-solid fa-lock"></i>
                <span>En tu cuenta ahora</span>
              </span>
            ` : ''}
          </div>

          <!-- Messages Stream -->
          <div id="client-full-chat-stream" class="flex-1 overflow-y-auto py-4 space-y-3">
            ${(order.chat || []).map(msg => {
              if (msg.sender === 'system') {
                const isWarning = msg.message.includes('Aviso del Sistema') || msg.message.includes('desasignado') || msg.message.includes('ha ingresado');
                const isSuccess = msg.message.includes('ha salido') || msg.message.includes('tomado tu orden');
                return `
                  <div class="flex flex-col items-center">
                    <div class="max-w-md p-2.5 rounded-xl text-center text-[10px] ${isWarning ? 'bg-amber-950/70 border border-amber-800 text-amber-200 shadow-sm' : (isSuccess ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-200' : 'bg-[#1b140f] border border-stone-800 text-stone-300')}">
                      ${msg.message}
                    </div>
                  </div>
                `;
              }
              const info = this.formatChatAuthorDisplay(msg);
              const isClientMsg = info.roleLabel === 'Cliente' || msg.sender === 'client';
              return `
                <div class="flex flex-col ${isClientMsg ? 'items-end' : 'items-start'}">
                  <div class="max-w-[80%] p-3 rounded-2xl text-xs ${info.bubbleClass} ${isClientMsg ? 'rounded-br-none' : 'rounded-bl-none'}">
                    <div class="text-[10px] mb-1 font-semibold flex items-center justify-between gap-4" style="color: ${info.authorColor}">
                      <span class="flex items-center gap-1.5">
                        <span>${info.cleanName}</span>
                        ${info.badgeHtml}
                      </span>
                      <span class="text-[9px] text-stone-500 font-normal">${new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <div class="leading-relaxed break-words">${msg.message}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Input Box -->
          <form onsubmit="event.preventDefault(); app.sendClientFullChatMessage();" class="pt-3 border-t border-stone-800 flex gap-2">
            <input id="client-full-chat-input" type="text" placeholder="Escribe un mensaje a tu booster sobre la orden..." class="flex-1 bg-[#17110d] border border-stone-700 rounded-xl px-4 py-2.5 text-xs text-white focus:border-[#ee914f] outline-none">
            <button type="submit" class="px-5 py-2.5 rounded-xl copper-gradient-bg font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-[#ee914f]/20">
              <i class="fa-solid fa-paper-plane text-stone-950"></i>
            </button>
          </form>

        </div>

        <!-- Right Column: DETALLES DE LA ORDEN (md:col-span-4) - Matching User Photo -->
        <div class="md:col-span-4 glass-panel rounded-2xl border border-stone-800 p-5 bg-[#140e0a] text-xs space-y-4 flex flex-col justify-between">
          <div class="space-y-4">
            <h3 class="text-xs font-bold text-[#fcefc2] uppercase tracking-wider pb-2 border-b border-stone-800 font-cinzel">Detalles de la Orden</h3>
            
            <div>
              <span class="text-[10px] text-stone-500 uppercase block font-semibold">ID:</span>
              <span class="font-mono-gaming font-bold text-base text-[#ee914f]">#${order.id}</span>
            </div>

            <div>
              <span class="text-[10px] text-stone-500 uppercase block font-semibold">Servicio:</span>
              <span class="font-bold text-white leading-tight block">${order.serviceName}</span>
            </div>

            <div>
              <span class="text-[10px] text-stone-500 uppercase block font-semibold">Personaje:</span>
              <span class="text-stone-300 font-medium">${order.characterName} (${order.realm})</span>
            </div>

            <div>
              <span class="text-[10px] text-stone-500 uppercase block font-semibold">Modalidad:</span>
              <span class="px-2 py-0.5 rounded bg-[#1f1610] text-[#eedaa2] border border-[#ee914f]/30 font-semibold inline-block mt-0.5">${order.completionMethod} (${order.region})</span>
            </div>

            <div>
              <span class="text-[10px] text-stone-500 uppercase block font-semibold">Estado del Booster:</span>
              ${order.isOnAccount ? `
                <span class="text-red-400 font-bold flex items-center gap-1.5 mt-0.5"><i class="fa-solid fa-triangle-exclamation"></i> En tu cuenta ahora</span>
              ` : `
                <span class="text-emerald-400 font-bold flex items-center gap-1.5 mt-0.5"><i class="fa-solid fa-circle-check"></i> Fuera de la cuenta</span>
              `}
            </div>

            <div>
              <span class="text-[10px] text-stone-500 uppercase block font-semibold">Protección VPN:</span>
              <span class="text-stone-300">${order.vpnLocation || 'VPN Local Configurada'}</span>
            </div>
          </div>

          <div class="pt-4 border-t border-stone-800">
            <span class="text-[10px] text-stone-500 uppercase block font-semibold">Total Pagado:</span>
            <span class="text-2xl font-black font-mono-gaming text-[#fcefc2]">$${(Math.max(0, Number(order.totalPrice !== undefined && !isNaN(Number(order.totalPrice)) ? order.totalPrice : (order.price !== undefined && !isNaN(Number(order.price)) ? order.price : 45.00)) || 45.00)).toFixed(2)}</span>
          </div>

        </div>

      </div>
    `;

    // Scroll chat to bottom
    const stream = document.getElementById('client-full-chat-stream');
    if (stream) stream.scrollTop = stream.scrollHeight;
  }

  sendClientFullChatMessage() {
    const input = document.getElementById('client-full-chat-input');
    const msg = input ? input.value.trim() : '';
    if (!msg || !this.activeClientChatOrderId) return;

    const order = this.orders.find(o => o.id === this.activeClientChatOrderId);
    if (!order) return;

    order.chat = order.chat || [];
    order.chat.push({
      sender: 'client',
      author: `${this.currentUser?.username || 'Cliente'} (Cliente)`,
      message: msg,
      timestamp: new Date().toISOString()
    });

    this.saveOrders();
    input.value = '';
    this.openClientFullChat(order.id);
  }

  showProAccessGate() {
    let gate = document.getElementById('pro-access-gate');
    if (!gate) {
      gate = document.createElement('div');
      gate.id = 'pro-access-gate';
      gate.className = 'fixed inset-0 z-50 bg-[#0a0705]/95 backdrop-blur-xl flex items-center justify-center p-4 notranslate';
      gate.setAttribute('translate', 'no');
      document.body.appendChild(gate);
    }
    const isEn = this.currentLang === 'en';
    const isPt = this.currentLang === 'pt';
    const title = isEn ? 'Pro Portal - Boosters Only' : (isPt ? 'Portal Pro - Apenas Boosters' : 'Portal Pro - Acceso Exclusivo para Boosters');
    const desc = isEn 
      ? 'This war room board is reserved for verified boosters and staff of Mythic Progression. Log in with your Discord account or enter preview mode.'
      : (isPt 
        ? 'Este painel é reservado para boosters e equipe verificada de Mythic Progression. Entre com sua conta do Discord ou acesse o modo de teste.'
        : 'Este tablón está reservado para jugadores profesionales (Boosters) y Staff de Mythic Progression. Inicia sesión con tu cuenta oficial para gestionar la bolsa de pedidos y el chat.');
    const btnLogin = isEn ? 'Log In with Discord' : (isPt ? 'Entrar com Discord' : 'Iniciar Sesión con Discord');
    const btnDemo = isEn ? 'Enter in Booster Demo Mode' : (isPt ? 'Entrar em Modo Booster (Demo)' : 'Acceder en Modo Booster (Demo)');
    const btnHome = isEn ? 'Return to Store' : (isPt ? 'Voltar para a Loja' : 'Volver a la Tienda Principal');

    gate.innerHTML = `
      <div class="glass-panel rounded-3xl w-full max-w-md p-6 sm:p-8 border border-[#ee914f]/40 shadow-2xl relative overflow-hidden bg-[#120d09] text-center">
        <div class="w-16 h-16 rounded-2xl bg-[#241a12] border border-[#ee914f]/50 flex items-center justify-center text-[#ee914f] text-2xl mx-auto mb-4 shadow-lg shadow-[#ee914f]/20">
          <i class="fa-solid fa-bolt"></i>
        </div>
        <h2 class="text-xl font-bold text-white font-cinzel mb-2">${title}</h2>
        <p class="text-xs text-stone-400 mb-6 leading-relaxed">${desc}</p>
        <div class="space-y-3">
          <button type="button" onclick="app.openAuthModal()" class="w-full py-3.5 px-4 rounded-xl copper-gradient-bg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-lg shadow-[#ee914f]/30 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer">
            <i class="fa-brands fa-discord text-base"></i>
            <span>${btnLogin}</span>
          </button>
          <button type="button" onclick="app.loginAsDemoBooster()" class="w-full py-3 px-4 rounded-xl bg-[#20150e] hover:bg-[#2d1e14] border border-[#ee914f]/40 text-[#fcefc2] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:border-[#ee914f] transition-all cursor-pointer">
            <i class="fa-solid fa-gamepad text-[#ee914f]"></i>
            <span>${btnDemo}</span>
          </button>
          <a href="/" class="inline-block pt-2 text-xs text-stone-400 hover:text-white transition-colors">
            <i class="fa-solid fa-arrow-left mr-1"></i> ${btnHome}
          </a>
        </div>
      </div>
    `;
    gate.classList.remove('hidden');
    gate.classList.add('flex');
  }

// BOOSTER PRO PORTAL (WAR ROOM BOARD)
  // ==========================================
  initProPortal() {
    // Check if user is Booster or Admin/Staff
    if (!this.isBooster() && !this.isAdminOrGerente()) {
      this.showProAccessGate();
      return;
    }

    const gate = document.getElementById('pro-access-gate');
    if (gate) gate.remove();

    this.renderProOrderFeed();
    this.renderProMyOrders();
    this.renderProWallet();
    this.renderChatList();
    this.renderBoosterUpsellCatalog();
    this.initBoosterProfileForm();

    const datalist = document.getElementById('pro-realms-datalist');
    if (datalist && Array.isArray(this.realms) && this.realms.length > 0) {
      datalist.innerHTML = this.realms.map(r => `<option value="${r.name} (${r.region})">`).join('');
    }
  }

  renderProOrderFeed() {
    const container = document.getElementById('pro-orders-feed');
    if (!container) return;

    const availableOrders = (this.orders || []).filter(o => o && (o.status === 'AVAILABLE' || o.status === 'BIDDING'));
    
    const countBadge = document.getElementById('available-orders-count');
    if (countBadge) countBadge.textContent = `${availableOrders.length} disponibles`;

    const sidebarBadge = document.getElementById('badge-avail-sidebar');
    if (sidebarBadge) sidebarBadge.textContent = availableOrders.length;

    if (availableOrders.length === 0) {
      container.innerHTML = `
        <div class="glass-panel rounded-2xl p-12 text-center">
          <i class="fa-solid fa-scroll text-4xl text-stone-600 mb-3"></i>
          <h3 class="text-lg font-bold text-stone-300">No hay contratos pendientes en este momento</h3>
          <p class="text-xs text-stone-500 mt-1">Los nuevos pedidos de clientes aparecerán aquí en tiempo real.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = availableOrders.map(order => {
      const category = order.category || 'Servicio WoW';
      const orderId = order.id || 'N/A';
      const region = order.region || 'US';
      const method = order.completionMethod || 'Piloted';
      const bids = (order.bids && Array.isArray(order.bids)) ? order.bids : [];
      const bidsCount = bids.length;
      let bestBid = null;
      if (bidsCount > 0) {
        // In reverse auction for booster payout, the lowest bid is the best offer for the company
        bestBid = [...bids].sort((a,b) => Number(a.bidAmount) - Number(b.bidAmount))[0];
      }
      const myBid = (this.currentUser && bidsCount > 0)
        ? bids.find(b => (this.currentUser.discordId && b.boosterDiscordId && String(b.boosterDiscordId) === String(this.currentUser.discordId)) || (this.currentUser.username && b.boosterName && b.boosterName.toLowerCase() === this.currentUser.username.toLowerCase()))
        : null;

      const serviceName = order.serviceName || 'Servicio Mythic Progression';
      const details = order.details || 'Detalles de la orden de juego';
      const vpnLocation = order.vpnLocation || 'No requerida';
      const timeStr = order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Reciente';
      const basePayoutVal = Number(order.boosterPayout || (order.totalPrice ? order.totalPrice * 0.3 : 0)).toFixed(2);
      const maxBidAllowedVal = Number(order.maxBidAllowed || (order.totalPrice ? order.totalPrice * 0.5 : (Number(basePayoutVal) * 1.5))).toFixed(2);

      const isMyBidWinning = myBid && bestBid && Number(myBid.bidAmount) <= Number(bestBid.bidAmount);

      return `
      <div class="glass-panel rounded-2xl p-5 mb-4 border ${bestBid ? 'border-amber-500/50 shadow-lg shadow-amber-950/20' : 'border-stone-800/80'} hover:border-[#ee914f]/60 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group">
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-2 flex-wrap">
            <span class="px-2.5 py-0.5 text-[11px] font-bold rounded-md bg-[#251c14] text-[#ee914f] border border-[#ee914f]/30">
              ${category}
            </span>
            <span class="text-xs font-mono-gaming font-bold text-stone-400">
              #${orderId}
            </span>
            <span class="text-[11px] px-2 py-0.5 rounded bg-stone-900 text-stone-300 border border-stone-800">
              ${region}
            </span>
            <span class="text-[11px] px-2 py-0.5 rounded ${method === 'Piloted' ? 'bg-[#301c10] text-[#fccc8f] border border-[#b85d1d]/40' : 'bg-[#18231a] text-emerald-400 border border-emerald-900/40'}">
              ${method}
            </span>
            ${bestBid ? `
              <span class="text-[11px] px-2.5 py-0.5 rounded-md bg-amber-950 text-amber-300 border border-amber-500/60 font-bold flex items-center gap-1.5 shadow-sm">
                <i class="fa-solid fa-crown text-amber-400"></i>
                <span>${bidsCount} Oferta${bidsCount > 1 ? 's' : ''} (Subasta Activa)</span>
              </span>
            ` : ''}
          </div>

          <h3 class="text-base font-bold text-white group-hover:text-[#fcefc2] transition-colors">
            ${serviceName}
          </h3>
          <p class="text-xs text-stone-400 mt-1">
            ${details}
          </p>

          ${bestBid ? `
            <div class="mt-3 p-3 rounded-xl bg-[#1e130c] border border-amber-500/40 flex flex-wrap items-center justify-between gap-2.5 text-xs shadow-inner">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs">
                  <i class="fa-solid fa-crown"></i>
                </span>
                <span class="text-stone-300 font-semibold">Mejor postor actual:</span>
                <span class="font-mono-gaming text-sm font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-md border border-emerald-500/50 shadow-sm">
                  $${Number(bestBid.bidAmount).toFixed(2)}
                </span>
                <span class="text-stone-400 text-[11px]">por</span>
                <strong class="text-[#fcefc2]">${bestBid.boosterName}</strong>
                <span class="text-[10px] text-stone-500 font-mono">(${bidsCount} oferta${bidsCount > 1 ? 's' : ''})</span>
                ${myBid ? (
                  isMyBidWinning 
                    ? `<span class="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold ml-1 flex items-center gap-1"><i class="fa-solid fa-crown text-[9px] text-amber-400"></i> ¡Vas ganando la orden! ($${Number(myBid.bidAmount).toFixed(2)})</span>`
                    : `<span class="text-[10px] px-2 py-0.5 rounded bg-stone-900 text-stone-400 border border-stone-800 font-medium ml-1">Tu oferta: $${Number(myBid.bidAmount).toFixed(2)}</span>`
                ) : ''}
              </div>
              <div class="text-[11px] text-stone-400 flex items-center gap-1 font-mono">
                <span class="text-stone-500">Mínimo base:</span>
                <span class="text-stone-300 font-bold">$${basePayoutVal}</span>
                <span class="text-stone-600">|</span>
                <span class="text-stone-500">Máx permitido:</span>
                <span class="text-stone-300 font-bold">$${maxBidAllowedVal}</span>
              </div>
            </div>
          ` : ''}

          <div class="text-[11px] text-stone-500 mt-2 flex items-center gap-3">
            <span><i class="fa-solid fa-shield-halved text-[#ee914f] mr-1"></i>VPN: ${vpnLocation}</span>
            <span><i class="fa-solid fa-clock mr-1"></i>Hora: ${timeStr}</span>
          </div>
        </div>

        <div class="flex items-center gap-4 border-t md:border-t-0 md:border-l border-stone-800 pt-3 md:pt-0 md:pl-6 justify-between md:justify-end">
          <div class="text-right">
            ${bestBid ? `
              <span class="text-[10px] text-amber-400 block uppercase tracking-wider font-semibold">
                <i class="fa-solid fa-crown text-xs mr-0.5"></i> Mejor Postor
              </span>
              <div class="text-2xl font-bold font-mono-gaming text-emerald-400">
                $${Number(bestBid.bidAmount).toFixed(2)}
              </div>
              <span class="text-[10px] text-stone-400 block">Base: $${basePayoutVal}</span>
            ` : `
              <span class="text-[10px] text-stone-400 block uppercase tracking-wider">Pago al Pro</span>
              <div class="text-2xl font-bold font-mono-gaming text-[#fcefc2]">
                $${basePayoutVal}
              </div>
              <span class="text-[10px] text-emerald-400/90 font-medium"><i class="fa-solid fa-circle-check text-[8px] mr-1"></i>Oferta disponible</span>
            `}
          </div>

          <div class="flex flex-col gap-2 min-w-[135px]">
            <button onclick="app.promptTakeOrder('${orderId}')" class="px-3.5 py-2 rounded-xl copper-gradient-bg font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:brightness-110 active:scale-[0.98]">
              <i class="fa-solid fa-bolt"></i>
              <span>Tomar Orden</span>
            </button>
            <button onclick="app.openBidModal('${orderId}')" class="px-3.5 py-2 rounded-xl bg-[#1f1712] hover:bg-[#2c2018] text-[#eedaa2] border border-[#ee914f]/35 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer">
              <i class="fa-solid fa-gavel"></i>
              <span>${myBid ? 'Mejorar Oferta' : 'Hacer Oferta'}</span>
            </button>
          </div>
        </div>
      </div>
      `;
    }).join('');
  }

  promptTakeOrder(orderId) {
    if (!this.checkBoosterPermission()) return;

    const order = this.orders.find(o => o.id === orderId);
    if (!order) return;

    let modal = document.getElementById('take-order-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'take-order-modal';
      modal.className = 'fixed inset-0 z-50 bg-black/85 backdrop-blur-md hidden items-center justify-center p-4';
      modal.innerHTML = '<div id="take-order-modal-content" class="glass-panel rounded-2xl w-full max-w-md border border-[#ee914f]/40 shadow-2xl"></div>';
      document.body.appendChild(modal);
    }

    const content = document.getElementById('take-order-modal-content');
    if (!content) return;

    const payout = Number(order.boosterPayout || 0);

    content.innerHTML = `
      <div class="p-6">
        <div class="flex items-center justify-between pb-3 border-b border-stone-800 mb-4">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-[#ee914f]/15 border border-[#ee914f]/40 flex items-center justify-center text-[#ee914f]">
              <i class="fa-solid fa-handshake text-base"></i>
            </div>
            <div>
              <h3 class="text-base font-bold text-[#fcefc2] font-cinzel">Confirmar Pedido</h3>
              <p class="text-[11px] text-stone-400">Verifica los detalles antes de aceptar para evitar penalizaciones</p>
            </div>
          </div>
          <button onclick="app.closeTakeOrderModal()" class="w-8 h-8 rounded-full bg-stone-900 text-stone-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="bg-[#140e0b] p-4 rounded-xl border border-stone-800 space-y-3 mb-4 text-xs">
          <div>
            <span class="text-stone-400 text-[10px] uppercase font-bold tracking-wider block">Orden a Tomar:</span>
            <div class="font-bold text-white text-sm mt-0.5 flex items-center gap-2">
              <span class="text-[#ee914f] font-mono-gaming font-bold">#${order.id}</span>
              <span>-</span>
              <span class="text-stone-200">${order.serviceName}</span>
            </div>
          </div>

          ${order.details ? `
            <div class="bg-[#1b120c] p-2.5 rounded-lg border border-stone-800/80 text-stone-300 text-[11px] leading-relaxed">
              <i class="fa-solid fa-circle-info text-[#ee914f] mr-1.5"></i>${order.details}
            </div>
          ` : ''}

          <div class="grid grid-cols-2 gap-2 text-[11px] text-stone-300 pt-1 border-t border-stone-800/60">
            <div><span class="text-stone-500">Región/Modalidad:</span> <strong class="text-white">${order.region || 'US'} | ${order.completionMethod || 'Piloted'}</strong></div>
            <div><span class="text-stone-500">VPN Requerida:</span> <strong class="text-stone-200">${order.vpnLocation || 'No requerida'}</strong></div>
          </div>
        </div>

        <!-- REWARD / PAYOUT BOX -->
        <div class="bg-gradient-to-r from-[#24150d] to-[#170e08] p-4 rounded-xl border border-[#ee914f]/50 mb-4 flex items-center justify-between">
          <div>
            <span class="text-[10px] text-stone-400 block uppercase tracking-wider font-semibold">Cantidad que recibirás por completar la orden:</span>
            <span class="text-[11px] text-emerald-400 flex items-center gap-1 font-medium mt-0.5">
              <i class="fa-solid fa-wallet text-[10px]"></i> Pago garantizado al Pro
            </span>
          </div>
          <div class="text-right">
            <div class="text-2xl font-black font-mono-gaming text-[#fcefc2]">
              $${payout.toFixed(2)} <span class="text-xs text-[#ee914f]">USD</span>
            </div>
          </div>
        </div>

        <div class="text-xs text-amber-200/90 bg-amber-950/30 border border-amber-800/40 p-3 rounded-xl mb-5 flex items-start gap-2.5 leading-relaxed">
          <i class="fa-solid fa-triangle-exclamation text-amber-400 text-sm mt-0.5 shrink-0"></i>
          <div>
            <strong class="text-amber-300 block mb-0.5">¿Aceptas tomar y comprometerte con este pedido?</strong>
            <span>Al aceptar, la orden se asignará a tu perfil Pro y se habilitará el chat directo con el cliente.</span>
          </div>
        </div>

        <div class="flex justify-end gap-3">
          <button onclick="app.closeTakeOrderModal()" class="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-bold transition-colors cursor-pointer">
            Cancelar
          </button>
          <button onclick="app.confirmTakeOrder('${order.id}')" class="px-5 py-2.5 rounded-xl copper-gradient-bg font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-[#ee914f]/20 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer">
            <i class="fa-solid fa-check"></i>
            <span>Sí, Aceptar y Tomar Pedido</span>
          </button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  confirmTakeOrder(orderId) {
    this.closeTakeOrderModal();
    this.takeOrder(orderId);
  }

  closeTakeOrderModal() {
    const modal = document.getElementById('take-order-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  takeOrder(orderId) {
    if (!this.checkBoosterPermission()) return;

    this.closeTakeOrderModal();

    const order = this.orders.find(o => o.id === orderId);
    if (!order) return;

    order.status = 'IN_PROGRESS';
    order.assignedBooster = {
      discordId: this.currentUser.discordId,
      username: this.currentUser.username,
      payout: order.boosterPayout
    };

    // Requirement 1 & 4: Automatic notification in order chat
    order.chat = order.chat || [];
    order.chat.push({
      sender: 'system',
      author: 'Sistema Mythic Progression',
      message: `El booster ${this.currentUser.username} ha tomado tu orden.`,
      timestamp: new Date().toISOString()
    });

    this.saveOrders();
    this.renderProOrderFeed();
    this.renderProMyOrders();
    this.renderChatList();

    if (this.liveChatChannel) {
      try {
        this.liveChatChannel.postMessage({ type: 'ORDER_CLAIMED', orderId: order.id, booster: this.currentUser.username });
      } catch (e) {}
    }

    this.showToast(`¡Orden #${order.id} tomada con éxito!`, 'success');
  }

  openBidModal(orderId) {
    if (!this.checkBoosterPermission()) return;

    const order = this.orders.find(o => o.id === orderId);
    if (!order) return;

    const modal = document.getElementById('bid-modal');
    const content = document.getElementById('bid-modal-content');
    if (!modal || !content) return;

    const basePayout = Number(order.boosterPayout || (order.totalPrice ? order.totalPrice * 0.3 : 10));
    const maxBid = Number(order.maxBidAllowed || (order.totalPrice ? order.totalPrice * 0.5 : (basePayout * 1.5)));
    const bids = Array.isArray(order.bids) ? order.bids : [];
    // The winning / best bidder is the one offering to do the work for the LOWEST payout
    const bestBid = bids.length > 0 ? [...bids].sort((a,b) => Number(a.bidAmount) - Number(b.bidAmount))[0] : null;

    const myBid = (this.currentUser && bids.length > 0)
      ? bids.find(b => (this.currentUser.discordId && b.boosterDiscordId && String(b.boosterDiscordId) === String(this.currentUser.discordId)) || (this.currentUser.username && b.boosterName && b.boosterName.toLowerCase() === this.currentUser.username.toLowerCase()))
      : null;

    // Suggest default value: to take the lead as best bidder, suggest undercutting the best bid by $0.50 (capped at basePayout)
    const suggestedBid = bestBid 
      ? Math.max(basePayout, Math.min(maxBid, Number(bestBid.bidAmount) - 0.50))
      : basePayout;

    content.innerHTML = `
      <div class="p-6">
        <div class="flex items-center justify-between pb-3 border-b border-stone-800 mb-4">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <i class="fa-solid fa-gavel text-base"></i>
            </div>
            <div>
              <h3 class="text-base font-bold text-[#fcefc2] font-cinzel">Subasta de Contrato</h3>
              <p class="text-[11px] text-stone-400">Orden #${order.id} - ${order.serviceName}</p>
            </div>
          </div>
          <button onclick="document.getElementById('bid-modal').classList.add('hidden')" class="w-8 h-8 rounded-full bg-stone-900 text-stone-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="bg-[#140e0b] p-4 rounded-xl border border-stone-800 space-y-2 mb-4 text-xs">
          <div class="flex justify-between items-center">
            <span class="text-stone-400">Pago base de la orden:</span>
            <span class="font-bold font-mono-gaming text-stone-300">$${basePayout.toFixed(2)}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-stone-400">Oferta máxima permitida:</span>
            <span class="font-bold font-mono-gaming text-amber-400">$${maxBid.toFixed(2)}</span>
          </div>
          ${bestBid ? `
            <div class="pt-2 border-t border-stone-800 flex justify-between items-center">
              <span class="text-amber-300 font-semibold flex items-center gap-1.5">
                <i class="fa-solid fa-crown text-amber-400"></i> Mejor postor actual (menor oferta):
              </span>
              <span class="font-bold font-mono-gaming text-emerald-400 text-sm">$${Number(bestBid.bidAmount).toFixed(2)} <span class="text-[10px] text-stone-400 font-normal">(${bestBid.boosterName})</span></span>
            </div>
          ` : `
            <div class="pt-2 border-t border-stone-800 text-[11px] text-stone-500 italic">
              No hay pujas activas aún. ¡Sé el primero en ofertar!
            </div>
          `}
          ${myBid ? `
            <div class="pt-1 flex justify-between items-center text-[11px]">
              <span class="text-stone-400">Tu oferta actual:</span>
              <span class="font-bold font-mono-gaming ${bestBid && Number(myBid.bidAmount) <= Number(bestBid.bidAmount) ? 'text-amber-300' : 'text-cyan-400'}">
                $${Number(myBid.bidAmount).toFixed(2)} ${bestBid && Number(myBid.bidAmount) <= Number(bestBid.bidAmount) ? '(¡Mejor Postor 👑!)' : ''}
              </span>
            </div>
          ` : ''}
        </div>

        <div class="mb-4">
          <label class="block text-xs font-semibold text-stone-300 mb-1.5 flex items-center justify-between">
            <span>Monto de tu oferta ($):</span>
            <span class="text-[11px] text-stone-400">Mín: $${basePayout.toFixed(2)} | Máx: $${maxBid.toFixed(2)}</span>
          </label>
          <div class="relative">
            <span class="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono-gaming text-stone-400 text-base">$</span>
            <input id="input-bid-amount" type="number" step="0.50" min="${basePayout.toFixed(2)}" max="${maxBid.toFixed(2)}" value="${suggestedBid.toFixed(2)}" class="w-full bg-[#17120e] border border-stone-700 focus:border-[#ee914f] rounded-xl pl-8 pr-4 py-2.5 text-base font-mono-gaming text-white outline-none">
          </div>
          <p class="text-[11px] text-stone-400 mt-1.5 leading-relaxed">
            Ingresa el monto que solicitas por completar este contrato. <strong class="text-amber-300">A la empresa le conviene quien menos oferte</strong>, por lo que el booster con la oferta más baja será el <strong class="text-[#fcefc2]">Mejor Postor 👑</strong> y tendrá prioridad para ganar la orden.
          </p>
        </div>

        ${bids.length > 0 ? `
          <div class="mb-4 bg-[#110c08] border border-stone-800/80 rounded-xl p-3">
            <span class="text-[10px] uppercase font-bold tracking-wider text-stone-400 block mb-2">Historial de Pujas (${bids.length}) - Ordenadas por Mejor Oferta:</span>
            <div class="max-h-28 overflow-y-auto space-y-1.5 pr-1">
              ${[...bids].sort((a,b) => Number(a.bidAmount) - Number(b.bidAmount)).map((b, idx) => `
                <div class="flex items-center justify-between text-xs py-1 px-2 rounded ${idx === 0 ? 'bg-amber-950/60 text-amber-200 border border-amber-600/50 shadow-sm' : 'bg-stone-900/40 text-stone-300'}">
                  <span class="flex items-center gap-1.5">
                    ${idx === 0 ? '<i class="fa-solid fa-crown text-amber-400 text-[10px]"></i>' : '<span class="text-stone-500 text-[10px] font-mono">#' + (idx + 1) + '</span>'}
                    <strong class="font-medium">${b.boosterName}</strong>
                    ${idx === 0 ? '<span class="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 uppercase">Mejor Postor</span>' : ''}
                  </span>
                  <span class="font-mono-gaming font-bold ${idx === 0 ? 'text-emerald-400' : 'text-stone-300'}">$${Number(b.bidAmount).toFixed(2)}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <div class="flex justify-end gap-3 pt-2">
          <button onclick="document.getElementById('bid-modal').classList.add('hidden')" class="px-4 py-2 rounded-xl bg-stone-900 text-stone-300 hover:text-white text-xs font-bold transition-colors cursor-pointer">
            Cancelar
          </button>
          <button onclick="app.submitBid('${order.id}')" class="px-5 py-2 rounded-xl copper-gradient-bg font-bold text-xs uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1.5">
            <i class="fa-solid fa-gavel"></i>
            <span>${myBid ? 'Actualizar Oferta' : 'Enviar Oferta'}</span>
          </button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  submitBid(orderId) {
    const order = this.orders.find(o => o.id === orderId);
    if (!order) return;

    if (!order.bids || !Array.isArray(order.bids)) {
      order.bids = [];
    }

    const basePayout = Number(order.boosterPayout || (order.totalPrice ? order.totalPrice * 0.3 : 10));
    const maxBid = Number(order.maxBidAllowed || (order.totalPrice ? order.totalPrice * 0.5 : (basePayout * 1.5)));

    const inputEl = document.getElementById('input-bid-amount');
    const amount = Number(inputEl ? inputEl.value : 0);

    if (isNaN(amount) || amount < basePayout || amount > maxBid) {
      this.showToast(`La oferta debe estar entre $${basePayout.toFixed(2)} y el máximo de $${maxBid.toFixed(2)}`, 'error');
      return;
    }

    order.status = 'BIDDING';

    const boosterName = (this.currentUser && this.currentUser.username) || 'Booster';
    const boosterDiscord = (this.currentUser && (this.currentUser.discordId || this.currentUser.id)) || '';
    const highestRole = typeof this.getHighestUserRole === 'function' ? this.getHighestUserRole(this.currentUser) : 'Booster';

    const existingIndex = order.bids.findIndex(b => 
      (boosterDiscord && b.boosterDiscordId && String(b.boosterDiscordId) === String(boosterDiscord)) ||
      (b.boosterName && b.boosterName.toLowerCase() === boosterName.toLowerCase())
    );

    const bidData = {
      boosterDiscordId: boosterDiscord,
      boosterName: boosterName,
      boosterRole: highestRole,
      bidAmount: amount,
      timestamp: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      order.bids[existingIndex] = bidData;
    } else {
      order.bids.push(bidData);
    }

    if (!order.chat) order.chat = [];
    order.chat.push({
      sender: 'system',
      message: `🔨 Nueva Puja: El booster ${boosterName} (${highestRole}) ha ofertado $${amount.toFixed(2)} por este pedido.`,
      timestamp: new Date().toISOString()
    });

    this.saveOrders();

    const modal = document.getElementById('bid-modal');
    if (modal) modal.classList.add('hidden');

    if (typeof this.renderProOrderFeed === 'function') this.renderProOrderFeed();
    if (typeof this.renderAdminOrders === 'function') this.renderAdminOrders(this.currentAdminOrderStatusFilter || 'ALL');

    this.showToast(`¡Oferta de $${amount.toFixed(2)} registrada con éxito!`, 'success');
  }

  renderProMyOrders() {
    const container = document.getElementById('pro-my-orders');
    if (!container) return;

    const myOrders = (this.orders || []).filter(o => {
      if (!o || !o.assignedBooster) return false;
      const u = this.currentUser;
      if (!u) return false;
      if (u.discordId && o.assignedBooster.discordId && String(u.discordId) === String(o.assignedBooster.discordId)) return true;
      if (u.username && o.assignedBooster.username && u.username.trim().toLowerCase() === o.assignedBooster.username.trim().toLowerCase()) return true;
      if (u.id && o.assignedBooster.id && String(u.id) === String(o.assignedBooster.id)) return true;
      return false;
    });

    const sidebarMyCount = document.getElementById('badge-my-count');
    if (sidebarMyCount) sidebarMyCount.textContent = myOrders.length;

    if (myOrders.length === 0) {
      container.innerHTML = `
        <div class="glass-panel rounded-2xl p-8 text-center text-stone-500 text-xs">
          No tienes contratos activos asignados. Toma uno en la "Bolsa de Pedidos".
        </div>
      `;
      return;
    }

    container.innerHTML = myOrders.map(order => `
      <div class="glass-panel rounded-2xl p-5 mb-4 border border-stone-800">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs font-mono-gaming font-bold text-[#ee914f]">#${order.id}</span>
              <span class="px-2 py-0.5 text-[10px] rounded font-bold ${order.status === 'COMPLETED' ? 'bg-[#152319] text-emerald-400 border border-emerald-800/40' : 'bg-[#2b1f15] text-[#fcefc2] border border-[#ee914f]/40'}">
                ${order.status === 'COMPLETED' ? 'COMPLETADO' : 'EN PROCESO'}
              </span>
              ${order.boosterPayoutRate === 50 ? `<span class="px-2 py-0.5 text-[10px] rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold">⭐ Venta Adicional 50%</span>` : ''}
            </div>
            <h4 class="text-sm font-bold text-white">${order.serviceName || 'Servicio'}</h4>
            <p class="text-xs text-stone-400">Cliente: ${order.clientName || 'Cliente'} (${order.characterName || 'Personaje'})</p>
          </div>

          <div class="flex items-center gap-4 flex-wrap">
            <div class="flex items-center gap-2 bg-[#17110d] px-3 py-1.5 rounded-xl border border-stone-800">
              <span class="text-[11px] text-stone-300 font-semibold">Estoy en la cuenta:</span>
              <label class="switch">
                <input type="checkbox" ${order.isOnAccount ? 'checked' : ''} onchange="app.toggleOnAccount('${order.id}', this.checked)">
                <span class="slider"></span>
              </label>
            </div>

            <button onclick="app.openChat('${order.id}')" class="p-2.5 rounded-xl bg-[#201812] hover:bg-[#2b2118] text-[#fcefc2] border border-[#ee914f]/30 text-xs flex items-center gap-1.5 cursor-pointer">
              <i class="fa-solid fa-comments text-[#ee914f]"></i>
              <span>Chat</span>
            </button>

            ${order.status === 'COMPLETED' ? `
              <span class="px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                <i class="fa-solid fa-circle-check"></i> Finalizada
              </span>
            ` : (order.status === 'PENDING_APPROVAL' ? `
              <span class="px-3 py-1.5 rounded-xl bg-amber-950/80 border border-amber-600/60 text-amber-300 text-xs font-bold flex items-center gap-1.5 animate-pulse" title="Reporte enviado, esperando aprobación del admin o cliente">
                <i class="fa-solid fa-clock"></i> En Revisión
              </span>
            ` : `
              <button onclick="app.promptBoosterReportCompletion('${order.id}')" class="px-4 py-2 rounded-xl copper-gradient-bg font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer hover:brightness-110 active:scale-[0.98]">
                <i class="fa-solid fa-flag-checkered mr-1"></i> Enviar Reporte
              </button>
              <button onclick="app.boosterReleaseOrder('${order.id}')" class="px-3 py-2 rounded-xl bg-stone-900/90 hover:bg-stone-800 text-stone-400 hover:text-rose-300 border border-stone-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors" title="Liberar contrato y devolver a la Bolsa de Pedidos">
                <i class="fa-solid fa-arrow-right-from-bracket"></i>
                <span>Liberar</span>
              </button>
            `)}
          </div>
        </div>
      </div>
    `).join('');
  }

  boosterReleaseOrder(orderId) {
    const order = this.orders.find(o => o.id === orderId);
    if (!order) return;

    if (confirm(`¿Deseas liberar la orden #${order.id} y devolverla a la Bolsa de Pedidos para que otro booster la tome?`)) {
      order.status = 'AVAILABLE';
      order.assignedBooster = null;
      order.isOnAccount = false;
      order.completionReport = null;

      order.chat = order.chat || [];
      order.chat.push({
        sender: 'system',
        author: 'Sistema Mythic Progression',
        message: `⚠️ El booster ${this.currentUser?.username || 'Booster'} ha liberado la orden #${order.id}. Vuelve a estar disponible en la Bolsa de Pedidos.`,
        timestamp: new Date().toISOString()
      });

      this.saveOrders();
      this.renderProOrderFeed();
      this.renderProMyOrders();
      this.renderChatList();
      if (typeof this.renderAdminOrders === 'function') this.renderAdminOrders(this.currentAdminOrderStatusFilter || 'ALL');

      if (this.liveChatChannel) {
        try {
          this.liveChatChannel.postMessage({ type: 'ORDER_UNASSIGNED', orderId: order.id });
        } catch (e) {}
      }

      this.showToast(`Has liberado la orden #${order.id}. Devuelta a la Bolsa de Pedidos.`, 'info');
    }
  }

  toggleOnAccount(orderId, isChecked) {
    const order = this.orders.find(o => o.id === orderId);
    if (!order) return;

    order.isOnAccount = isChecked;
    order.chat = order.chat || [];
    order.chat.push({
      sender: 'system',
      author: 'Notificación de Cuenta',
      message: isChecked 
        ? `⚠️ El booster ${this.currentUser.username} ha ingresado a la cuenta. Por favor NO inicies sesión para evitar desconexiones de World of Warcraft.`
        : `✅ El booster ha salido de la cuenta. Ya puedes ingresar normalmente.`,
      timestamp: new Date().toISOString()
    });

    this.saveOrders();
    this.showToast(isChecked ? 'Notificado al cliente: Estás en la cuenta' : 'Notificado al cliente: Saliste de la cuenta', 'info');
  }

  promptBoosterReportCompletion(orderId) {
    const order = this.orders.find(o => o.id === orderId);
    if (!order) return;

    let modal = document.getElementById('report-completion-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'report-completion-modal';
      modal.className = 'fixed inset-0 z-50 bg-black/85 backdrop-blur-md hidden items-center justify-center p-4';
      modal.innerHTML = '<div id="report-completion-modal-content" class="glass-panel rounded-2xl w-full max-w-md border border-[#ee914f]/40 shadow-2xl"></div>';
      document.body.appendChild(modal);
    }

    const content = document.getElementById('report-completion-modal-content');
    if (!content) return;

    const payout = Number(order.boosterPayout || order.assignedBooster?.payout || 0);

    content.innerHTML = `
      <div class="p-6">
        <div class="flex items-center justify-between pb-3 border-b border-stone-800 mb-4">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <i class="fa-solid fa-flag-checkered text-base"></i>
            </div>
            <div>
              <h3 class="text-base font-bold text-[#fcefc2] font-cinzel">Reporte de Finalización</h3>
              <p class="text-[11px] text-stone-400">Orden #${order.id} - ${order.serviceName}</p>
            </div>
          </div>
          <button onclick="app.closeReportCompletionModal()" class="w-8 h-8 rounded-full bg-stone-900 text-stone-400 hover:text-white flex items-center justify-center cursor-pointer">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="space-y-4 text-xs">
          <div class="p-3.5 rounded-xl bg-[#221811] border border-[#ee914f]/30">
            <div class="text-stone-300 mb-1 leading-relaxed">
              Al enviar tu reporte, el staff de administración o el cliente verificarán los objetivos del servicio. Una vez aprobado, se acreditarán <strong class="text-[#fcefc2] font-mono-gaming font-bold">$${payout.toFixed(2)}</strong> a tu saldo retirable.
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-stone-300 mb-1.5">
              Notas de entrega / Enlace de captura (Opcional):
            </label>
            <textarea id="completion-report-notes" rows="3" placeholder="Ej: Keystone +10 completada a tiempo en 24min. Enlace imgur con screenshot..." class="w-full bg-[#17120e] border border-stone-700 rounded-xl p-3 text-xs text-white focus:border-[#ee914f] outline-none resize-none"></textarea>
          </div>

          <div class="flex justify-end gap-3 pt-2">
            <button onclick="app.closeReportCompletionModal()" class="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-bold transition-colors cursor-pointer">
              Cancelar
            </button>
            <button onclick="app.submitBoosterCompletionReport('${order.id}')" class="px-5 py-2.5 rounded-xl copper-gradient-bg font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-[#ee914f]/20 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer">
              <i class="fa-solid fa-paper-plane"></i>
              <span>Enviar Reporte</span>
            </button>
          </div>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  closeReportCompletionModal() {
    const modal = document.getElementById('report-completion-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  submitBoosterCompletionReport(orderId) {
    const order = this.orders.find(o => o.id === orderId);
    if (!order) return;

    const notesEl = document.getElementById('completion-report-notes');
    const notes = notesEl ? notesEl.value.trim() : '';

    this.closeReportCompletionModal();

    order.status = 'PENDING_APPROVAL';
    order.isOnAccount = false;
    order.completionReport = {
      reportedAt: new Date().toISOString(),
      notes: notes,
      booster: this.currentUser?.username || 'Booster'
    };

    order.chat = order.chat || [];
    order.chat.push({
      sender: 'system',
      author: 'Reporte de Servicio',
      message: `📋 El booster ${this.currentUser?.username || 'Booster'} ha enviado el reporte de finalización del servicio.${notes ? '\nNotas/Evidencia: ' + notes : ''}\n\nEn espera de verificación y aprobación por el Administrador o el Cliente.`,
      timestamp: new Date().toISOString()
    });

    this.saveOrders();
    this.renderProMyOrders();
    this.renderChatList();
    if (typeof this.renderAdminOrders === 'function') this.renderAdminOrders(this.currentAdminOrderStatusFilter || 'ALL');
    if (typeof this.renderClientOrders === 'function') this.renderClientOrders();

    if (this.liveChatChannel) {
      try {
        this.liveChatChannel.postMessage({ type: 'ORDER_REPORTED', orderId: order.id });
      } catch (e) {}
    }

    this.showToast('Reporte de finalización enviado a revisión.', 'success');
  }

  finishOrderModal(orderId) {
    this.promptBoosterReportCompletion(orderId);
  }

  renderProWallet() {
    let completedEarnings = 0;
    if (Array.isArray(this.orders)) {
      this.orders.forEach(o => {
        if (o && o.status === 'COMPLETED' && o.assignedBooster) {
          const match = (this.currentUser?.discordId && o.assignedBooster.discordId && String(this.currentUser.discordId) === String(o.assignedBooster.discordId)) ||
                        (this.currentUser?.username && o.assignedBooster.username && this.currentUser.username.trim().toLowerCase() === o.assignedBooster.username.trim().toLowerCase()) ||
                        (this.currentUser?.id && o.assignedBooster.id && String(this.currentUser.id) === String(o.assignedBooster.id));
          if (match) {
            completedEarnings += Number(o.assignedBooster.payout || o.boosterPayout || 0);
          }
        }
      });
    }

    const bal = (this.currentUser?.balance !== undefined && this.currentUser?.balance !== null)
      ? Number(this.currentUser.balance)
      : completedEarnings;

    const balanceElem = document.getElementById('booster-balance');
    if (balanceElem) {
      balanceElem.textContent = `$${bal.toFixed(2)}`;
    }
    const walletAvail = document.getElementById('wallet-avail-balance');
    if (walletAvail) {
      walletAvail.textContent = `$${bal.toFixed(2)}`;
    }
    const withdrawAmount = document.getElementById('wallet-withdraw-amount');
    if (withdrawAmount) {
      withdrawAmount.value = bal > 0 ? bal : 0;
      withdrawAmount.max = bal;
      withdrawAmount.placeholder = bal > 0 ? `$${bal.toFixed(2)}` : '$0.00';
    }
    const withdrawAddr = document.getElementById('wallet-withdraw-address');
    if (withdrawAddr && (this.currentUser?.payoutAddress || this.currentUser?.payout_address || this.currentUser?.wallet_id)) {
      withdrawAddr.value = this.currentUser.payoutAddress || this.currentUser.payout_address || this.currentUser.wallet_id;
    }
  }

  // ==========================================
  // BOOSTER UPSELL / SERVICIOS ADICIONALES (Req 6)
  // ==========================================
  renderBoosterUpsellCatalog() {
    const container = document.getElementById('booster-upsell-container');
    if (!container) return;

    container.innerHTML = `
      <div class="glass-panel p-6 rounded-2xl border border-[#ee914f]/40 mb-6">
        <div class="flex items-center gap-3 mb-2">
          <i class="fa-solid fa-gem text-2xl text-[#ee914f]"></i>
          <div>
            <h3 class="text-base font-bold text-[#fcefc2] font-cinzel">Venta de Servicios Adicionales (50% Ganancia)</h3>
            <p class="text-xs text-stone-400">Ofrécele un servicio adicional a tu cliente activo. Si compra mediante tu recomendación, garantizas el <strong class="text-[#ee914f]">50% de la ganancia total</strong>.</p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${this.services.map(svc => `
          <div class="glass-panel p-4 rounded-xl border border-stone-800 flex justify-between items-center">
            <div>
              <h4 class="text-sm font-bold text-white">${svc.name}</h4>
              <span class="text-xs text-stone-400 font-mono-gaming">Precio: $${svc.basePrice.toFixed(2)} | Tu 50%: <strong class="text-[#fcefc2]">$${(svc.basePrice * 0.50).toFixed(2)}</strong></span>
            </div>
            <button onclick="app.copyBoosterUpsellLink('${svc.id}')" class="px-3 py-1.5 rounded-lg copper-gradient-bg font-bold text-xs flex items-center gap-1.5">
              <i class="fa-solid fa-link"></i>
              <span>Copiar Link (50%)</span>
            </button>
          </div>
        `).join('')}
      </div>
    `;
  }

  copyBoosterUpsellLink(serviceId) {
    const boosterName = this.currentUser?.username || 'Pro';
    const link = `${window.location.origin}/product?id=${serviceId}&ref_booster=${encodeURIComponent(boosterName)}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(link).then(() => {
      this.showToast(`¡Enlace copiado! Pégalo en el chat con tu cliente. Recibirás el 50% si lo compra.`, 'success');
    }).catch(() => {
      prompt('Copia este enlace de venta adicional (50% de comisión):', link);
    });
  }

  checkBoosterUpsellReferral() {
    const params = new URLSearchParams(window.location.search);
    const refBooster = params.get('ref_booster');
    if (refBooster) {
      sessionStorage.setItem('mp_upsell_booster', refBooster);
      this.showToast(`Promoción especial recomendada por tu booster ${refBooster}. ¡Garantía de servicio express!`, 'info');
    }
  }

  // ==========================================
  // BOOSTER PRO PROFILE & PAYOUT SETTINGS
  // ==========================================
  initBoosterProfileForm() {
    // Determine active booster data
    let b = null;
    if (this.currentUser) {
      if (this.currentUser.type === 'booster' || this.currentUser.type === 'staff' || this.currentUser.type === 'admin' || this.isBooster() || this.isAdminOrGerente()) {
        b = this.currentUser;
      }
    }
    if (!b) return;

    const dbRecord = (this.boosters && b.discordId) ? this.boosters.find(x => x.discord_id === b.discordId) : null;

    // If avatar missing, recover from dbRecord
    if (!b.avatar && dbRecord && dbRecord.avatar) {
      b.avatar = dbRecord.avatar;
    }

    // Populate inputs if form exists in DOM
    const nameInput = document.getElementById('pro-prof-name');
    if (nameInput) nameInput.value = b.username || '';

    const roleInput = document.getElementById('pro-prof-role');
    if (roleInput) roleInput.value = b.role ? `${b.role} (${b.points || 0} pts)` : `Booster (${b.points || 0} pts)`;

    const avatarInput = document.getElementById('pro-prof-avatar');
    if (avatarInput) avatarInput.value = b.avatar || '';

    const emailInput = document.getElementById('pro-prof-email');
    if (emailInput) emailInput.value = b.email || (dbRecord && dbRecord.email) || '';

    const payoutEmailInput = document.getElementById('pro-prof-payout-email');
    if (payoutEmailInput) payoutEmailInput.value = b.payoutEmail || b.payout_email || (dbRecord && (dbRecord.payout_email || dbRecord.email)) || '';

    const payoutMethodSelect = document.getElementById('pro-prof-payout-method');
    if (payoutMethodSelect) {
      const pm = b.payoutMethod || b.payout_method || (dbRecord && dbRecord.payout_method) || 'Binance Pay / USDT';
      payoutMethodSelect.value = pm;
      this.onBoosterPayoutMethodChange(pm);
    }

    const payoutAddressInput = document.getElementById('pro-prof-payout-address');
    if (payoutAddressInput) payoutAddressInput.value = b.payoutAddress || b.payout_address || b.wallet_id || (dbRecord && (dbRecord.wallet_id || dbRecord.payout_address)) || '';

    const payoutCurrencySelect = document.getElementById('pro-prof-payout-currency');
    if (payoutCurrencySelect) payoutCurrencySelect.value = b.payoutCurrency || 'USD';

    const discordInput = document.getElementById('pro-prof-discord');
    if (discordInput) discordInput.value = b.discordId || b.discord_id || (dbRecord && dbRecord.discord_id) || '';

    const battletagInput = document.getElementById('pro-prof-battletag');
    if (battletagInput) battletagInput.value = b.battletag || (dbRecord && dbRecord.battletag) || '';

    const regionSelect = document.getElementById('pro-prof-region');
    if (regionSelect) regionSelect.value = b.region || (dbRecord && dbRecord.region) || 'América (US) & Europa (EU)';

    const realmInput = document.getElementById('pro-prof-realm');
    if (realmInput) realmInput.value = b.realm || (dbRecord && dbRecord.realm) || '';

    const factionSelect = document.getElementById('pro-prof-faction');
    if (factionSelect) factionSelect.value = b.faction || (dbRecord && dbRecord.faction) || 'Ambas (Cross-Faction)';

    const rolesInput = document.getElementById('pro-prof-roles');
    if (rolesInput) rolesInput.value = b.mainRoles || (dbRecord && dbRecord.mainRoles) || 'Tanque / DPS Melee';

    const bioInput = document.getElementById('pro-prof-bio');
    if (bioInput) bioInput.value = b.bio || (dbRecord && dbRecord.bio) || '';

    // Update preview card and sidebar
    this.updateBoosterPreviewCard(b);
    this.syncBoosterSidebarCard(b);

    // Render linked accounts status widget
    this.renderLinkedAccountsWidget('pro-linked-accounts-container');
  }

  updateBoosterPreviewCard(b) {
    const prevName = document.getElementById('pro-preview-name');
    if (prevName) prevName.textContent = b.username || 'Booster Pro';

    const prevRole = document.getElementById('pro-preview-role');
    if (prevRole) prevRole.textContent = `${b.role || 'Booster'} (${b.points || 0} pts)`;

    const prevBio = document.getElementById('pro-preview-bio');
    if (prevBio) prevBio.textContent = b.bio ? `"${b.bio}"` : '"Booster activo de Mythic Progression."';

    const prevPoints = document.getElementById('pro-preview-points');
    if (prevPoints) prevPoints.textContent = `${b.points || 0} Pts`;

    const prevBalance = document.getElementById('pro-preview-balance');
    if (prevBalance) prevBalance.textContent = `$${(b.balance !== undefined ? Number(b.balance) : 0).toFixed(2)}`;

    const prevMethod = document.getElementById('pro-preview-payout-method');
    if (prevMethod) {
      const pm = b.payoutMethod || b.payout_method || 'Binance Pay';
      prevMethod.textContent = pm.split(' ')[0] || pm;
    }

    const prevDiscord = document.getElementById('pro-preview-discord');
    if (prevDiscord) {
      const tag = b.discordId || b.discord_id || '';
      prevDiscord.textContent = tag ? (tag.includes('@') ? tag : `@${tag.split('#')[0]}`) : '@discord';
    }

    const prevRegion = document.getElementById('pro-preview-region');
    if (prevRegion) prevRegion.textContent = b.region ? (b.region.includes('US') && b.region.includes('EU') ? 'US & EU' : (b.region.includes('US') ? 'US' : 'EU')) : 'US & EU';

    this.previewBoosterAvatar(b.avatar || '');
  }

  syncBoosterSidebarCard(b) {
    const nameEl = document.getElementById('booster-sidebar-name');
    if (nameEl) nameEl.textContent = b.username || 'Booster Pro';

    const roleEl = document.getElementById('booster-sidebar-role');
    if (roleEl) roleEl.textContent = `${b.role || 'Booster'} (${b.points || 0} pts)`;

    const imgEl = document.getElementById('booster-sidebar-avatar-img');
    const initEl = document.getElementById('booster-avatar-initial');

    if (b.avatar && imgEl && initEl) {
      imgEl.src = b.avatar;
      imgEl.classList.remove('hidden');
      initEl.classList.add('hidden');
      imgEl.onerror = () => {
        imgEl.classList.add('hidden');
        initEl.classList.remove('hidden');
      };
    } else if (initEl) {
      if (imgEl) imgEl.classList.add('hidden');
      initEl.classList.remove('hidden');
      initEl.textContent = (b.username || 'M')[0].toUpperCase();
    }
  }

  previewBoosterAvatar(url) {
    const previewImg = document.getElementById('pro-preview-avatar-img');
    const previewInit = document.getElementById('pro-preview-avatar-initial');
    if (!previewImg || !previewInit) return;

    if (url && url.trim().length > 5) {
      previewImg.src = url.trim();
      previewImg.classList.remove('hidden');
      previewInit.classList.add('hidden');
      previewImg.onerror = () => {
        previewImg.classList.add('hidden');
        previewInit.classList.remove('hidden');
      };
    } else {
      previewImg.classList.add('hidden');
      previewInit.classList.remove('hidden');
      const name = document.getElementById('pro-prof-name')?.value || 'M';
      previewInit.textContent = name[0].toUpperCase();
    }
  }

  setBoosterPresetAvatar(presetUrl) {
    const avatarInput = document.getElementById('pro-prof-avatar');
    if (avatarInput) {
      avatarInput.value = presetUrl;
      this.previewBoosterAvatar(presetUrl);
    }
  }

  onBoosterPayoutMethodChange(method) {
    const label = document.getElementById('pro-prof-payout-address-label');
    const input = document.getElementById('pro-prof-payout-address');
    if (!label || !input) return;

    if (method.includes('Binance')) {
      label.textContent = 'Binance Pay ID / Pay Email:';
      input.placeholder = 'Ej: Binance Pay ID (8-9 dígitos) o email de Binance';
    } else if (method.includes('PayPal')) {
      label.textContent = 'Correo Electrónico de PayPal:';
      input.placeholder = 'Ej: pagos@tudominio.com';
    } else if (method.includes('Zelle')) {
      label.textContent = 'Destinatario de Zelle (Email o Teléfono):';
      input.placeholder = 'Ej: nombre@email.com o +1 (555) 000-0000';
    } else if (method.includes('USDT')) {
      label.textContent = 'Dirección de Billetera USDT (TRC20 / BSC):';
      input.placeholder = 'Ej: T9yD14Nj9j7xAB4dbGeiX9h8unkKHXUn';
    } else {
      label.textContent = 'Número de Cuenta Bancaria / CBU / IBAN:';
      input.placeholder = 'Ej: CBU / IBAN / Número de cuenta y banco';
    }
  }

  saveBoosterProfile() {
    const name = document.getElementById('pro-prof-name')?.value.trim();
    if (!name) {
      this.showToast('Por favor introduce un nombre de booster válido.', 'error');
      return;
    }

    const avatar = document.getElementById('pro-prof-avatar')?.value.trim() || '';
    const email = document.getElementById('pro-prof-email')?.value.trim() || '';
    const payoutEmail = document.getElementById('pro-prof-payout-email')?.value.trim() || email;
    const payoutMethod = document.getElementById('pro-prof-payout-method')?.value || 'Binance Pay / USDT';
    const payoutAddress = document.getElementById('pro-prof-payout-address')?.value.trim() || '';
    const payoutCurrency = document.getElementById('pro-prof-payout-currency')?.value || 'USD';
    const discordId = document.getElementById('pro-prof-discord')?.value.trim() || '';
    const battletag = document.getElementById('pro-prof-battletag')?.value.trim() || '';
    const region = document.getElementById('pro-prof-region')?.value || 'América (US) & Europa (EU)';
    const realm = document.getElementById('pro-prof-realm')?.value.trim() || '';
    const faction = document.getElementById('pro-prof-faction')?.value || 'Ambas (Cross-Faction)';
    const mainRoles = document.getElementById('pro-prof-roles')?.value.trim() || '';
    const bio = document.getElementById('pro-prof-bio')?.value.trim() || '';

    // Initialize or update currentUser
    if (!this.currentUser) {
      this.showToast('Debes iniciar sesión para editar tu perfil.', 'error');
      return;
    }
    const oldUsername = this.currentUser.username || '';
    const wasAdmin = this.currentUser.type === 'admin' || this.currentUser.isAdmin;
    const wasStaff = this.currentUser.type === 'staff' || this.currentUser.isStaff;
    this.currentUser.type = wasAdmin ? 'admin' : (wasStaff ? 'staff' : 'booster');
    this.currentUser.username = name;
    this.currentUser.avatar = avatar;
    this.currentUser.email = email;
    this.currentUser.payoutEmail = payoutEmail;
    this.currentUser.payout_email = payoutEmail;
    this.currentUser.payoutMethod = payoutMethod;
    this.currentUser.payout_method = payoutMethod;
    this.currentUser.payoutAddress = payoutAddress;
    this.currentUser.payoutCurrency = payoutCurrency;
    this.currentUser.discordId = discordId || this.currentUser.discordId || '';
    this.currentUser.discord_id = this.currentUser.discordId;
    this.currentUser.battletag = battletag;
    this.currentUser.region = region;
    this.currentUser.realm = realm;
    this.currentUser.faction = faction;
    this.currentUser.mainRoles = mainRoles;
    this.currentUser.bio = bio;
    this.currentUser.isBooster = true;
    if (wasAdmin) {
      this.currentUser.isAdmin = true;
      if (!this.currentUser.roles || !Array.isArray(this.currentUser.roles)) {
        this.currentUser.roles = ['Master Booster', 'Staff / Admin'];
      }
    } else if (wasStaff) {
      this.currentUser.isStaff = true;
      if (!this.currentUser.roles || !Array.isArray(this.currentUser.roles)) {
        this.currentUser.roles = ['Booster', 'Staff / Admin'];
      }
    }

    if (avatar) {
      localStorage.setItem('mp_discord_avatar_backup', avatar);
    }

    this.saveUser();

    // Sync with this.boosters list in memory and localStorage
    if (this.boosters && this.boosters.length > 0) {
      const activeDiscordId = this.currentUser.discordId;
      const idx = this.boosters.findIndex(b => 
        (activeDiscordId && b.discord_id === activeDiscordId) || 
        (oldUsername && b.username.toLowerCase() === oldUsername.toLowerCase())
      );
      if (idx !== -1) {
        this.boosters[idx] = {
          ...this.boosters[idx],
          username: name,
          avatar: avatar,
          email: email,
          payout_email: payoutEmail,
          payout_method: payoutMethod,
          payout_address: payoutAddress,
          wallet_id: payoutAddress,
          battletag: battletag,
          region: region,
          realm: realm,
          faction: faction,
          mainRoles: mainRoles,
          bio: bio
        };
        this.saveBoosters();
      } else {
        this.boosters.push({
          username: name,
          role: wasAdmin ? 'Master Booster & Admin' : (wasStaff ? 'Staff / Admin' : 'Booster'),
          roles: wasAdmin ? ['Master Booster', 'Staff / Admin'] : (wasStaff ? ['Booster', 'Staff / Admin'] : ['Booster']),
          points: this.currentUser.points || 0,
          approved: true,
          balance: 0.00,
          email: email,
          avatar: avatar,
          payout_email: payoutEmail,
          payout_method: payoutMethod,
          payout_address: payoutAddress,
          wallet_id: payoutAddress,
          discord_id: activeDiscordId || ('booster_' + Date.now()),
          battletag: battletag,
          region: region,
          realm: realm,
          faction: faction,
          mainRoles: mainRoles,
          bio: bio
        });
        this.saveBoosters();
      }
    }

    // Refresh UI components
    this.updateBoosterPreviewCard(this.currentUser);
    this.syncBoosterSidebarCard(this.currentUser);
    this.renderHeader();

    this.showToast('¡Perfil Pro y datos de cobro guardados con éxito!', 'success');
  }

  // ==========================================
  // MULTI CHAT SYSTEM (BOOSTER VIEW - STRICT PRIVACY)
  // ==========================================
  renderChatList() {
    const listContainer = document.getElementById('chat-conversations-list');
    if (!listContainer) return;

    // Strict Privacy (Req 4): Staff/Admin sees all orders; Booster ONLY sees orders assigned to THEM
    const isAdminUrl = (typeof window !== 'undefined' && window.location.pathname.toLowerCase().includes('admin'));
    const isStaffOrAdmin = isAdminUrl || this.currentUser?.type === 'admin' || this.currentUser?.type === 'staff' || this.isAdminOrGerente();
    const myChatOrders = isStaffOrAdmin 
      ? (this.orders || []) 
      : (this.orders || []).filter(o => {
          if (!o || !o.assignedBooster) return false;
          const u = this.currentUser;
          if (!u) return false;
          if (u.discordId && o.assignedBooster.discordId && String(u.discordId) === String(o.assignedBooster.discordId)) return true;
          if (u.username && o.assignedBooster.username && u.username.trim().toLowerCase() === o.assignedBooster.username.trim().toLowerCase()) return true;
          if (u.id && o.assignedBooster.id && String(u.id) === String(o.assignedBooster.id)) return true;
          return false;
        });

    let visitorChatCount = 0;
    try {
      const storedLive = JSON.parse(localStorage.getItem('mp_live_support_chat')) || [];
      visitorChatCount = storedLive.filter(m => m.sender !== 'support' && !m.isContext).length;
    } catch (e) {}

    const liveItem = isStaffOrAdmin ? `
      <div onclick="app.openAdminLiveSupportChat()" class="p-3 rounded-xl cursor-pointer transition-all mb-2 ${this.activeChatOrderId === 'live_support' ? 'bg-[#271047] border border-[#a855f7] shadow-[0_0_15px_rgba(168,85,247,0.25)]' : 'bg-[#180e29] hover:bg-[#200f38] border border-purple-900/40'}">
        <div class="flex items-center justify-between mb-1">
          <div class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span class="text-xs font-bold text-[#f3e8ff]">Soporte en Vivo (Web)</span>
          </div>
          <span class="text-[9px] bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-800/40 font-mono font-bold">${visitorChatCount > 0 ? visitorChatCount + ' msgs' : '24/7 Web'}</span>
        </div>
        <p class="text-[10px] text-stone-400 truncate">Consultas preventa de visitantes y clientes...</p>
      </div>
    ` : '';

    if (myChatOrders.length === 0) {
      listContainer.innerHTML = liveItem + `<div class="p-4 text-xs text-stone-500 text-center">No hay chats de órdenes registrados</div>`;
      return;
    }

    listContainer.innerHTML = liveItem + myChatOrders.map(o => `
      <div onclick="app.openChat('${o.id}')" class="p-3.5 rounded-xl cursor-pointer transition-all ${this.activeChatOrderId === o.id ? 'bg-[#291e16] border border-[#ee914f]/50' : 'hover:bg-[#1a140f] border border-transparent'}">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-bold text-white">${o.clientName || 'Cliente'}</span>
          <span class="text-[10px] text-stone-400">#${o.id}</span>
        </div>
        <div class="flex items-center justify-between text-[10px] text-stone-500 mb-1">
          <span class="truncate max-w-[120px]">${o.serviceName || 'Servicio'}</span>
          <span class="text-[#ee914f]">${o.assignedBooster ? o.assignedBooster.username : 'Sin booster'}</span>
        </div>
        <p class="text-[11px] text-stone-400 truncate">${o.chat && o.chat.length ? o.chat[o.chat.length - 1].message : 'Abrir chat...'}</p>
      </div>
    `).join('');

    if (!this.activeChatOrderId && myChatOrders.length > 0) {
      this.openChat(myChatOrders[0].id);
    }
  }

  openChat(orderId) {
    this.activeChatOrderId = orderId;
    const order = this.orders.find(o => o.id === orderId);
    if (!order) return;

    // Strict Privacy check (Req 4)
    if (!this.canAccessOrderChat(order)) {
      this.showToast('Acceso restringido: no puedes acceder a este chat.', 'error');
      return;
    }

    if (typeof window.switchProTab === 'function') {
      window.switchProTab('chat');
    }
    if (typeof window.switchAdminTab === 'function') {
      window.switchAdminTab('chat');
    }

    this.renderChatList();
    const chatContainer = document.getElementById('chat-active-window');
    if (!chatContainer) return;

    const myRole = this.getUserChatRole();
    const isAdminUser = myRole === 'Admin';
    const isStaffUser = myRole === 'Staff';

    chatContainer.innerHTML = `
      <div class="mythic-guild-banner p-3.5 text-xs text-[#fcefc2] flex items-start gap-2.5 rounded-xl mb-4">
        <i class="fa-solid fa-dragon text-[#ee914f] text-sm mt-0.5"></i>
        <div>
          <span class="font-bold text-[#ee914f]">NORMATIVA MYTHIC PROGRESSION:</span> Prohibido comerciar por fuera de la plataforma. La violación resultará en sanción permanente y congelación de saldo.
        </div>
      </div>

      <div class="flex flex-col md:flex-row gap-4 h-[500px]">
        <div class="flex-1 flex flex-col bg-[#110d0a] rounded-xl border border-stone-800 p-4">
          <div class="flex items-center justify-between pb-3 border-b border-stone-800">
            <div>
              <h4 class="text-sm font-bold text-white">${order.clientName} (Cliente)</h4>
              <span class="text-[10px] text-emerald-400"><i class="fa-solid fa-circle text-[8px] mr-1"></i>En línea para orden #${order.id}</span>
            </div>
            <button onclick="app.copyBoosterUpsellLink('mplus-keystone')" class="px-2.5 py-1 rounded-lg bg-[#271d15] text-[#fcefc2] border border-[#ee914f]/30 text-[11px] font-bold hover:bg-[#34271c]">
              <i class="fa-solid fa-gem text-[#ee914f] mr-1"></i>Ofrecer Servicio (+50%)
            </button>
          </div>

          <div id="chat-messages-scroll" class="flex-1 overflow-y-auto py-4 space-y-3">
            ${(order.chat || []).map(msg => {
              if (msg.sender === 'system') {
                const isWarning = msg.message.includes('Aviso del Sistema') || msg.message.includes('desasignado') || msg.message.includes('ha ingresado');
                const isSuccess = msg.message.includes('ha salido') || msg.message.includes('tomado tu orden');
                return `
                  <div class="flex flex-col items-center">
                    <span class="text-[10px] ${isWarning ? 'bg-amber-950/70 border border-amber-800 text-amber-200 shadow-sm' : (isSuccess ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-200' : 'bg-[#1a140f] border border-stone-800 text-stone-300')} px-3 py-1 rounded-full text-center">
                      ${msg.message}
                    </span>
                  </div>
                `;
              }
              const info = this.formatChatAuthorDisplay(msg);
              const isRightSide = info.isSelf || (myRole === 'Booster' && info.roleLabel === 'Booster');
              return `
                <div class="flex flex-col ${isRightSide ? 'items-end' : 'items-start'}">
                  <div class="max-w-[75%] p-3 rounded-2xl text-xs ${info.bubbleClass} ${isRightSide ? 'rounded-br-none' : 'rounded-bl-none'}">
                    <div class="text-[10px] mb-1 font-semibold flex items-center gap-1.5" style="color: ${info.authorColor}">
                      <span>${info.cleanName}</span>
                      ${info.badgeHtml}
                    </div>
                    <div class="leading-relaxed break-words">${msg.message}</div>
                  </div>
                  <span class="text-[9px] text-stone-500 mt-1">${new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
              `;
            }).join('')}
          </div>

          <form onsubmit="event.preventDefault(); app.sendChatMessage();" class="flex gap-2 pt-3 border-t border-stone-800">
            <input id="chat-input-text" type="text" placeholder="${isAdminUser ? 'Escribe como Admin en el chat de la orden...' : (isStaffUser ? 'Escribe como Staff en el chat de la orden...' : 'Escribe un mensaje al cliente sobre la orden...')}" class="flex-1 bg-[#17120e] border border-stone-700 rounded-xl px-4 py-2 text-xs text-white focus:border-[#ee914f] outline-none">
            <button type="submit" class="px-4 py-2 rounded-xl ${isAdminUser ? 'purple-gradient-bg text-white' : 'copper-gradient-bg text-stone-950'} font-bold text-xs">
              <i class="fa-solid fa-paper-plane"></i>
            </button>
          </form>
        </div>

        <div class="w-full md:w-64 bg-[#140f0c] rounded-xl border border-stone-800 p-4 text-xs space-y-3">
          <h5 class="font-bold text-[#fcefc2] border-b border-stone-800 pb-2 font-cinzel">Detalles de la Orden</h5>
          <div>
            <span class="text-stone-500 block">ID:</span>
            <span class="text-[#ee914f] font-mono-gaming font-bold text-sm">#${order.id}</span>
          </div>
          <div>
            <span class="text-stone-500 block">Servicio:</span>
            <span class="text-white font-semibold">${order.serviceName}</span>
          </div>
          <div>
            <span class="text-stone-500 block">Personaje:</span>
            <span class="text-stone-300">${order.characterName}</span>
          </div>
          <div>
            <span class="text-stone-500 block">Modalidad:</span>
            <span class="text-stone-300">${order.completionMethod} (${order.region})</span>
          </div>
          <div>
            <span class="text-stone-500 block">VPN Requerida:</span>
            <span class="text-stone-300">${order.vpnLocation}</span>
          </div>
          <div class="pt-2 border-t border-stone-800">
            <span class="text-stone-500 block">Tu ganancia:</span>
            <span class="text-[#fcefc2] font-bold font-mono-gaming text-base">$${order.boosterPayout.toFixed(2)} (${order.boosterPayoutRate || 30}%)</span>
          </div>
        </div>
      </div>
    `;

    setTimeout(() => {
      const scroll = document.getElementById('chat-messages-scroll');
      if (scroll) scroll.scrollTop = scroll.scrollHeight;
    }, 50);
  }

  sendChatMessage() {
    const input = document.getElementById('chat-input-text');
    if (!input || !input.value.trim() || !this.activeChatOrderId) return;

    const order = this.orders.find(o => o.id === this.activeChatOrderId);
    if (!order) return;

    const roleLabel = this.getHighestUserRole(this.currentUser);
    const authorName = this.currentUser?.username || (roleLabel === 'Admin' ? 'Admin' : (roleLabel === 'Staff' ? 'Staff' : 'Pro'));

    let senderKey = 'booster';
    if (this.isAdmin()) senderKey = 'admin';
    else if (this.isStaffOnly()) senderKey = 'staff';
    else if (this.currentUser?.type === 'client') senderKey = 'client';

    order.chat = order.chat || [];
    order.chat.push({
      sender: senderKey,
      author: `${authorName} (${roleLabel})`,
      role: roleLabel,
      discordId: this.currentUser?.discordId || this.currentUser?.discord_id || '',
      message: input.value.trim(),
      timestamp: new Date().toISOString()
    });

    this.saveOrders();
    input.value = '';
    this.openChat(this.activeChatOrderId);

    if (this.liveChatChannel) {
      try {
        this.liveChatChannel.postMessage({ type: 'ORDER_CHAT_MESSAGE', orderId: this.activeChatOrderId });
      } catch (e) {}
    }
  }

  openAdminLiveSupportChat() {
    this.activeChatOrderId = 'live_support';
    this.renderChatList();
    const chatContainer = document.getElementById('chat-active-window');
    if (!chatContainer) return;

    let stored = [];
    try {
      stored = JSON.parse(localStorage.getItem('mp_live_support_chat')) || [];
    } catch (e) {
      stored = [];
    }

    chatContainer.innerHTML = `
      <div class="p-3.5 bg-gradient-to-r from-[#1f0d36] to-[#120726] border border-purple-900/50 rounded-xl mb-3 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-purple-900/40 border border-purple-500/50 flex items-center justify-center text-purple-300">
            <i class="fa-solid fa-headset text-lg"></i>
          </div>
          <div>
            <h4 class="text-sm font-bold text-white flex items-center gap-2">
              <span>Soporte Preventa en Vivo (Visitantes Web)</span>
              <span class="text-[9px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-800 font-semibold">24/7 En línea</span>
            </h4>
            <p class="text-[11px] text-stone-400">Mensajes enviados a través del widget flotante de la tienda y "Chatear antes de ordenar".</p>
          </div>
        </div>
        <button onclick="app.clearLiveSupportChat()" class="text-[11px] text-stone-400 hover:text-red-400 px-2.5 py-1 rounded-lg border border-stone-800 hover:border-red-900/50 transition-colors cursor-pointer">
          <i class="fa-solid fa-trash-can mr-1"></i>Limpiar historial
        </button>
      </div>

      <div class="flex flex-col h-[460px] bg-[#11061f] rounded-xl border border-stone-800 p-4">
        <div id="admin-live-messages-scroll" class="flex-1 overflow-y-auto space-y-3 py-2 pr-1">
          ${stored.map(m => {
            const isSupport = m.sender === 'support';
            if (m.isContext) {
              return `
                <div class="p-2.5 rounded-xl bg-[#200c3b] border border-purple-700/50 text-[#f3e8ff] text-[11px] my-1">
                  ${m.message}
                </div>
              `;
            }
            return `
              <div class="flex flex-col ${isSupport ? 'items-end' : 'items-start'}">
                <div class="flex items-center gap-1.5 mb-0.5 text-[10px] text-stone-500">
                  <span class="font-bold ${isSupport ? 'text-purple-300' : 'text-emerald-400'}">${m.author || (isSupport ? 'Staff' : 'Visitante')}</span>
                  <span>•</span>
                  <span>${m.time || ''}</span>
                </div>
                <div class="max-w-[85%] px-3.5 py-2 rounded-2xl ${isSupport ? 'bg-[#3b1768] text-purple-100 border border-purple-600/40' : 'bg-[#1a1226] text-stone-200 border border-stone-800'} text-xs leading-relaxed break-words">
                  ${m.message}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="pt-3 border-t border-stone-800 flex items-center gap-2">
          <input id="admin-live-reply-input" type="text" placeholder="Escribe tu respuesta como Admin al visitante..." onkeydown="if(event.key==='Enter') app.sendAdminLiveReply()" class="flex-1 bg-[#180a2c] border border-stone-700/80 focus:border-[#a855f7] rounded-xl px-4 py-2.5 text-xs text-white placeholder-stone-500 outline-none">
          <button onclick="app.sendAdminLiveReply()" class="px-4 py-2.5 rounded-xl bg-[#a855f7] hover:bg-[#9333ea] text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-purple-900/30">
            <i class="fa-solid fa-paper-plane"></i>
            <span>Responder</span>
          </button>
        </div>
      </div>
    `;

    setTimeout(() => {
      const scroll = document.getElementById('admin-live-messages-scroll');
      if (scroll) scroll.scrollTop = scroll.scrollHeight;
    }, 50);
  }

  sendAdminLiveReply() {
    const input = document.getElementById('admin-live-reply-input');
    if (!input || !input.value.trim()) return;

    let stored = [];
    try {
      stored = JSON.parse(localStorage.getItem('mp_live_support_chat')) || [];
    } catch (e) {
      stored = [];
    }

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const replyMsg = {
      id: 'msg_' + Date.now(),
      sender: 'support',
      author: this.currentUser?.username ? `${this.currentUser.username} (Admin)` : 'Admin (Miguelb)',
      message: input.value.trim(),
      time: timeStr
    };

    stored.push(replyMsg);
    localStorage.setItem('mp_live_support_chat', JSON.stringify(stored));
    this.liveChatMessages = stored;
    this.syncLiveSupportToCloud();
    input.value = '';

    if (this.liveChatChannel) {
      try {
        this.liveChatChannel.postMessage({ type: 'NEW_LIVE_CHAT_MSG', msg: replyMsg });
      } catch (e) {}
    }

    this.openAdminLiveSupportChat();
    this.renderLiveChatMessages();
    this.showToast('Respuesta enviada al visitante en vivo', 'success');
  }

  clearLiveSupportChat() {
    localStorage.removeItem('mp_live_support_chat');
    this.liveChatMessages = [];
    if (this.db) {
      this.db.collection('live_support').doc('global_chat').delete().catch(e => console.warn(e));
    }
    if (this.liveChatChannel) {
      try {
        this.liveChatChannel.postMessage({ type: 'NEW_LIVE_CHAT_MSG' });
      } catch (e) {}
    }
    this.renderLiveChatMessages();
    this.openAdminLiveSupportChat();
    this.showToast('Historial de chat en vivo restablecido.', 'info');
  }

  // ==========================================
  

  // ==========================================
  // ADMIN PORTAL (STAFF OVERVIEW, CLIENTS, ORDERS & PRODUCT CRUD)
  // ==========================================
  initAdminPortal() {
    // STRICT ACCESS GUARD: Staff & Admin Only
    if (!this.currentUser) {
      this.showToast('Inicia sesión con tu cuenta de Staff o Administrador para acceder al panel.', 'info');
      if (typeof this.openAuthModal === 'function') this.openAuthModal();
      return;
    }

    if (!this.isAdminOrGerente()) {
      document.body.style.display = 'none';
      this.showToast('Acceso Denegado: Se requieren permisos de Administrador o Staff.', 'error');
      setTimeout(() => {
        window.location.replace('/');
      }, 500);
      return;
    }
    const adminDisplay = document.getElementById('admin-user-display');
    if (adminDisplay && this.currentUser) {
      adminDisplay.textContent = this.currentUser.username || 'Miguelb (Admin)';
    }
    const adminAvatar = document.getElementById('admin-avatar-initial');
    if (adminAvatar && this.currentUser) {
      const av = this.currentUser.avatar || localStorage.getItem('mp_discord_avatar_backup');
      if (av) {
        adminAvatar.parentElement.innerHTML = `<img src="${av}" alt="Avatar" class="w-full h-full object-cover rounded-full" onerror="this.parentElement.innerHTML='<span id=\\'admin-avatar-initial\\'>${(this.currentUser.username || 'A')[0].toUpperCase()}</span>'">`;
      } else {
        adminAvatar.textContent = (this.currentUser.username || 'A')[0].toUpperCase();
      }
    }

    this.renderLanguageSelector();
    this.setupAdminSearchAndFilters();
    this.renderAdminOverview();
    this.renderAdminProductsManager();
    this.renderAdminOrders();
    this.initHistoryOrdersPanel();
    this.renderAdminClients();
    this.renderAdminBoosters();
    this.renderChatList();

    // Initialize exclusive sidebar tab (default: 'dashboard' or URL hash)
    if (typeof window.switchAdminTab === 'function') {
      const initialTab = (window.location.hash || '').replace('#', '');
      const validTabs = ['dashboard', 'catalog', 'orders', 'history', 'clients', 'boosters', 'chat'];
      if (validTabs.includes(initialTab)) {
        window.switchAdminTab(initialTab);
        if (initialTab === 'chat') {
          this.openAdminLiveSupportChat();
        }
      } else {
        window.switchAdminTab('dashboard');
      }
    }
  }

  setupAdminSearchAndFilters() {
    this.currentAdminOrderStatusFilter = 'ALL';
    this.currentAdminBoosterFilter = 'ALL';
    this.currentAdminBoosterRoleFilter = 'ALL';
    this.currentAdminBoosterSearch = '';
  }

  renderAdminOverview() {
    const totalRev = this.orders.reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0);
    const companyRev = totalRev * (COMPANY_MARGIN_PERCENT / 100);
    const boosterRev = totalRev * (BOOSTER_DEFAULT_PERCENT / 100);

    const revElem = document.getElementById('admin-company-rev');
    if (revElem) revElem.textContent = `$${companyRev.toFixed(2)}`;

    const boosterRevElem = document.getElementById('admin-booster-rev');
    if (boosterRevElem) boosterRevElem.textContent = `$${boosterRev.toFixed(2)}`;

    const topCompanyRev = document.getElementById('top-company-rev');
    if (topCompanyRev) topCompanyRev.textContent = `$${companyRev.toFixed(2)}`;

    const topBoosterRev = document.getElementById('top-booster-rev');
    if (topBoosterRev) topBoosterRev.textContent = `$${boosterRev.toFixed(2)}`;

    const ordersCount = document.getElementById('admin-orders-count');
    if (ordersCount) ordersCount.textContent = this.orders.length;

    const boostersCount = document.getElementById('admin-boosters-count');
    if (boostersCount) boostersCount.textContent = this.boosters.length;

    const clientsCount = document.getElementById('admin-clients-count');
    if (clientsCount) clientsCount.textContent = this.clients.length;

    // Sidebar navigation badges (Órdenes Web count only available orders)
    const availableOrdersCount = (this.orders || []).filter(o => o && (o.status === 'AVAILABLE' || o.status === 'BIDDING')).length;
    const badgeOrders = document.getElementById('badge-orders-count');
    if (badgeOrders) badgeOrders.textContent = availableOrdersCount;

    const badgeBoosters = document.getElementById('badge-boosters-count');
    if (badgeBoosters) badgeBoosters.textContent = this.boosters.length;

    const badgeClients = document.getElementById('badge-clients-count');
    if (badgeClients) badgeClients.textContent = this.clients.length;

    const badgeCatalog = document.getElementById('badge-catalog-count');
    if (badgeCatalog) badgeCatalog.textContent = this.services.length;
  }

  // 1. GESTOR DE PRODUCTOS Y PRECIOS DEL CATÁLOGO (CRUD COMPLETO)
  renderAdminProductsManager(filterTerm = '') {
    const container = document.getElementById('admin-products-table');
    if (!container) return;

    let list = this.services;
    if (filterTerm) {
      const term = filterTerm.toLowerCase();
      list = list.filter(s => 
        s.name.toLowerCase().includes(term) || 
        s.category.toLowerCase().includes(term) || 
        s.id.toLowerCase().includes(term)
      );
    }

    if (list.length === 0) {
      container.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-xs text-stone-500">No se encontraron productos en el catálogo.</td></tr>`;
      return;
    }

    container.innerHTML = list.map(svc => `
      <tr class="hover:bg-[#190a33] transition-colors text-xs text-stone-300 border-b border-stone-800/40">
        <td class="py-4 px-5 font-mono-gaming text-[#a855f7] font-bold whitespace-nowrap">${svc.id}</td>
        <td class="py-4 px-5 font-bold text-white flex items-center gap-3">
          <div class="w-8 h-8 rounded-xl bg-[#230f3f] border border-[#a855f7]/30 flex items-center justify-center text-[#a855f7] shrink-0">
            <i class="fa-solid ${svc.icon || 'fa-dungeon'} text-xs"></i>
          </div>
          <div>
            <div class="text-white text-sm leading-snug">${svc.name}</div>
            <div class="text-[11px] text-stone-400 mt-0.5 truncate max-w-sm">${svc.description ? svc.description.slice(0, 75) + '...' : ''}</div>
          </div>
        </td>
        <td class="py-4 px-5 whitespace-nowrap">
          <span class="inline-flex items-center px-3 py-1 rounded-full bg-[#241042] text-[#f3e8ff] border border-[#a855f7]/30 text-[11px] font-semibold">
            ${svc.category}
          </span>
        </td>
        <td class="py-4 px-5 font-mono-gaming font-bold text-[#f3e8ff] text-sm whitespace-nowrap">
          $${Number(svc.basePrice).toFixed(2)}
        </td>
        <td class="py-4 px-5 whitespace-nowrap">
          <span class="inline-flex items-center px-2.5 py-1 rounded-lg bg-stone-900 border border-stone-800 text-[10px] text-stone-300 font-semibold">
            ${svc.badge || 'Popular'}
          </span>
        </td>
        <td class="py-4 px-5 text-right whitespace-nowrap">
          <div class="flex items-center justify-end gap-2">
            <button onclick="app.editProductModal('${svc.id}')" class="px-3 py-1.5 rounded-xl bg-[#241042] hover:bg-[#33175c] text-[#f3e8ff] border border-[#a855f7]/40 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all">
              <i class="fa-solid fa-pen-to-square text-[#a855f7]"></i>
              <span>Editar</span>
            </button>
            <button onclick="app.deleteProduct('${svc.id}')" class="px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/50 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all">
              <i class="fa-solid fa-trash"></i>
              <span>Eliminar</span>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  filterAdminProducts(val) {
    this.renderAdminProductsManager(val);
  }

  switchProductModalTab(tabId) {
    const tabs = ['general', 'keys', 'traders', 'extras', 'badges'];
    tabs.forEach(t => {
      const content = document.getElementById(`adm-pcontent-${t}`);
      const btn = document.getElementById(`adm-ptab-${t}`);
      if (t === tabId) {
        if (content) content.classList.remove('hidden');
        if (btn) {
          btn.className = 'px-3.5 py-1.5 rounded-xl bg-[#29104a] text-[#a855f7] border border-[#a855f7]/50 flex items-center gap-2 transition-all cursor-pointer font-semibold shadow-sm';
        }
      } else {
        if (content) content.classList.add('hidden');
        if (btn) {
          btn.className = 'px-3.5 py-1.5 rounded-xl bg-[#150a2e] hover:bg-[#201610] text-stone-400 hover:text-white border border-stone-800 flex items-center gap-2 transition-all cursor-pointer font-semibold';
        }
      }
    });
  }

  addModalKeyLevelRow(level = '', price = '', recommended = false) {
    const container = document.getElementById('adm-key-levels-list');
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'grid grid-cols-12 gap-2 items-center bg-[#120726] p-2 rounded-xl border border-stone-800/80 adm-key-row';
    row.innerHTML = `
      <div class="col-span-3">
        <input type="text" value="${level}" placeholder="+10" class="w-full bg-[#1b0c36] border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-white text-center font-mono-gaming font-bold outline-none focus:border-[#a855f7] adm-key-lvl">
      </div>
      <div class="col-span-4">
        <input type="number" step="0.5" value="${price}" placeholder="38.00" class="w-full bg-[#1b0c36] border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-[#f3e8ff] font-mono-gaming font-bold outline-none focus:border-[#a855f7] adm-key-prc">
      </div>
      <div class="col-span-3 flex justify-center">
        <input type="radio" name="adm_key_recommended" ${recommended ? 'checked' : ''} class="w-4 h-4 accent-[#a855f7] cursor-pointer adm-key-rec" title="Marcar como recomendado">
      </div>
      <div class="col-span-2 flex justify-end">
        <button type="button" onclick="this.closest('.adm-key-row').remove()" class="w-7 h-7 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/50 flex items-center justify-center text-xs transition-colors cursor-pointer" title="Eliminar fila">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;
    container.appendChild(row);
  }

  renderModalKeyLevels(levels) {
    const container = document.getElementById('adm-key-levels-list');
    if (!container) return;
    container.innerHTML = '';
    if (!levels || levels.length === 0) {
      this.resetModalKeyLevels();
      return;
    }
    levels.forEach(lvl => {
      this.addModalKeyLevelRow(lvl.level, lvl.price, !!lvl.recommended);
    });
  }

  resetModalKeyLevels() {
    const defaultLevels = [
      { level: 2, price: 12.00, recommended: false },
      { level: 4, price: 16.00, recommended: false },
      { level: 6, price: 22.00, recommended: false },
      { level: 8, price: 28.00, recommended: false },
      { level: 10, price: 38.00, recommended: true },
      { level: 12, price: 52.00, recommended: false },
      { level: 14, price: 70.00, recommended: false },
      { level: 15, price: 85.00, recommended: false },
      { level: 18, price: 115.00, recommended: false },
      { level: 20, price: 145.00, recommended: false }
    ];
    const container = document.getElementById('adm-key-levels-list');
    if (container) container.innerHTML = '';
    defaultLevels.forEach(lvl => this.addModalKeyLevelRow(lvl.level, lvl.price, lvl.recommended));
  }

  addModalTraderRow(label = '', price = 0) {
    const container = document.getElementById('adm-traders-list');
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'grid grid-cols-12 gap-2 items-center bg-[#120726] p-2 rounded-xl border border-stone-800 adm-trader-row';
    row.innerHTML = `
      <div class="col-span-7">
        <input type="text" value="${label}" placeholder="VIP Group (+3 traders)" class="w-full bg-[#1b0c36] border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#a855f7] adm-trader-lbl">
      </div>
      <div class="col-span-3">
        <input type="number" step="0.01" value="${price}" placeholder="2.50" class="w-full bg-[#1b0c36] border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-[#f3e8ff] font-mono-gaming font-bold outline-none focus:border-[#a855f7] adm-trader-prc">
      </div>
      <div class="col-span-2 flex justify-end">
        <button type="button" onclick="this.closest('.adm-trader-row').remove()" class="w-7 h-7 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/50 flex items-center justify-center text-xs transition-colors cursor-pointer" title="Eliminar trader">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;
    container.appendChild(row);
  }

  renderModalTraders(traders) {
    const container = document.getElementById('adm-traders-list');
    if (!container) return;
    container.innerHTML = '';
    const list = (traders && traders.length > 0) ? traders : [
      { label: 'Premium Group (x2 loot-traders)', price: 0.00 },
      { label: 'VIP Group (+3 loot-traders)', price: 2.27 },
      { label: 'Top Group (+4 loot-traders)', price: 2.92 }
    ];
    list.forEach(t => this.addModalTraderRow(t.label, t.price));
  }

  addModalModeRow(label = '', price = 0, tag = '') {
    const container = document.getElementById('adm-modes-list');
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'grid grid-cols-12 gap-2 items-center bg-[#120726] p-2 rounded-xl border border-stone-800 adm-mode-row';
    row.innerHTML = `
      <div class="col-span-5">
        <input type="text" value="${label}" placeholder="Self-play" class="w-full bg-[#1b0c36] border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#a855f7] adm-mode-lbl">
      </div>
      <div class="col-span-3">
        <input type="number" step="0.01" value="${price}" placeholder="0.00" class="w-full bg-[#1b0c36] border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-[#f3e8ff] font-mono-gaming font-bold outline-none focus:border-[#a855f7] adm-mode-prc">
      </div>
      <div class="col-span-2">
        <input type="text" value="${tag}" placeholder="Gratis" class="w-full bg-[#1b0c36] border border-stone-700 rounded-lg px-2 py-1.5 text-xs text-stone-300 outline-none focus:border-[#a855f7] adm-mode-tag">
      </div>
      <div class="col-span-2 flex justify-end">
        <button type="button" onclick="this.closest('.adm-mode-row').remove()" class="w-7 h-7 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/50 flex items-center justify-center text-xs transition-colors cursor-pointer" title="Eliminar método">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;
    container.appendChild(row);
  }

  renderModalModes(modes) {
    const container = document.getElementById('adm-modes-list');
    if (!container) return;
    container.innerHTML = '';
    const list = (modes && modes.length > 0) ? modes : [
      { label: 'Self-play', price: 0.00, tag: 'Gratis' },
      { label: 'Piloted (Juega un Pro con VPN)', price: 0.00, tag: 'Incluido' },
      { label: 'Self-play Remote', price: 1.95, tag: '+$1.95' }
    ];
    list.forEach(m => this.addModalModeRow(m.label, m.price, m.tag));
  }

  addModalExtraRow(label = '', price = 0) {
    const container = document.getElementById('adm-extras-list');
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'grid grid-cols-12 gap-2 items-center bg-[#120726] p-2 rounded-xl border border-stone-800 adm-extra-row';
    row.innerHTML = `
      <div class="col-span-7">
        <input type="text" value="${label}" placeholder="Rank One Team" class="w-full bg-[#1b0c36] border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#a855f7] adm-extra-lbl">
      </div>
      <div class="col-span-3">
        <input type="number" step="0.01" value="${price}" placeholder="1.95" class="w-full bg-[#1b0c36] border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-[#f3e8ff] font-mono-gaming font-bold outline-none focus:border-[#a855f7] adm-extra-prc">
      </div>
      <div class="col-span-2 flex justify-end">
        <button type="button" onclick="this.closest('.adm-extra-row').remove()" class="w-7 h-7 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/50 flex items-center justify-center text-xs transition-colors cursor-pointer" title="Eliminar extra">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;
    container.appendChild(row);
  }

  renderModalExtras(extras) {
    const container = document.getElementById('adm-extras-list');
    if (!container) return;
    container.innerHTML = '';
    const list = (extras && extras.length > 0) ? extras : [
      { label: 'Rank One Team', price: 1.95 },
      { label: 'Stream Privado en Discord', price: 2.50 }
    ];
    list.forEach(e => this.addModalExtraRow(e.label, e.price));
  }

  resetModalMplusDefaults() {
    this.resetModalKeyLevels();

    const timerChk = document.getElementById('adm-timer-enabled');
    if (timerChk) timerChk.checked = true;
    const timerLbl = document.getElementById('adm-timer-label');
    if (timerLbl) timerLbl.value = 'Timer guaranteed';
    const timerPrc = document.getElementById('adm-timer-price');
    if (timerPrc) timerPrc.value = '0';

    this.renderModalTraders([
      { label: 'Premium Group (x2 loot-traders)', price: 0.00 },
      { label: 'VIP Group (+3 loot-traders)', price: 2.27 },
      { label: 'Top Group (+4 loot-traders)', price: 2.92 }
    ]);

    this.renderModalModes([
      { label: 'Self-play', price: 0.00, tag: 'Gratis' },
      { label: 'Piloted (Juega un Pro con VPN)', price: 0.00, tag: 'Incluido' },
      { label: 'Self-play Remote', price: 1.95, tag: '+$1.95' }
    ]);

    this.renderModalExtras([
      { label: 'Rank One Team', price: 1.95 },
      { label: 'Stream Privado en Discord', price: 2.50 }
    ]);

    const dungeonsArea = document.getElementById('adm-dungeons-textarea');
    if (dungeonsArea) {
      dungeonsArea.value = [
        'Random Dungeon (Más Rápido)',
        'The Stonevault',
        'City of Threads',
        'The Dawnbreaker',
        'Ara-Kara, City of Echoes',
        'Grim Batol',
        'The Necrotic Wake',
        'Mists of Tirna Scithe',
        'Siege of Boralus'
      ].join('\n');
    }

    const estStart = document.getElementById('adm-est-start');
    if (estStart) estStart.value = '10-15 min';
    const estExec = document.getElementById('adm-est-exec');
    if (estExec) estExec.value = '15-30 min';

    const b1 = document.getElementById('adm-badge-1');
    if (b1) b1.value = '311 ilvl Gear';
    const b2 = document.getElementById('adm-badge-2');
    if (b2) b2.value = '318 Weekly Vault';
    const b3 = document.getElementById('adm-badge-3');
    if (b3) b3.value = 'FREE Timer & Traders';

    const volD = document.getElementById('adm-vol-discount');
    if (volD) volD.value = '5';
    const cshB = document.getElementById('adm-cashback-pct');
    if (cshB) cshB.value = '5';

    this.showToast('Valores recomendados de The War Within cargados.', 'info');
  }

  openNewProductModal() {
    const modal = document.getElementById('admin-product-modal');
    if (!modal) return;

    this.switchProductModalTab('general');

    const title = document.getElementById('adm-modal-title');
    if (title) title.textContent = 'Crear Nuevo Producto en Catálogo';
    document.getElementById('adm-prod-id').value = '';
    document.getElementById('adm-prod-name').value = '';
    document.getElementById('adm-prod-cat').value = 'Míticas Plus';
    document.getElementById('adm-prod-price').value = '25.00';
    document.getElementById('adm-prod-icon').value = 'fa-dungeon';
    document.getElementById('adm-prod-badge').value = 'Nuevo';
    document.getElementById('adm-prod-desc').value = '';

    this.resetModalMplusDefaults();

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  editProductModal(productId) {
    const svc = this.services.find(s => s.id === productId);
    if (!svc) return;

    const modal = document.getElementById('admin-product-modal');
    if (!modal) return;

    this.switchProductModalTab('general');

    const title = document.getElementById('adm-modal-title');
    if (title) title.textContent = `Editar Producto: ${svc.name}`;
    document.getElementById('adm-prod-id').value = svc.id;
    document.getElementById('adm-prod-name').value = svc.name;
    document.getElementById('adm-prod-cat').value = svc.category;
    document.getElementById('adm-prod-price').value = svc.basePrice;
    document.getElementById('adm-prod-icon').value = svc.icon || 'fa-dungeon';
    document.getElementById('adm-prod-badge').value = svc.badge || 'Popular';
    document.getElementById('adm-prod-desc').value = svc.description || '';

    // Populate Tab 2: Key Levels
    const opts = svc.options || {};
    this.renderModalKeyLevels(opts.keyLevels || []);

    // Populate Tab 3: Timer & Traders & Modes
    const timer = opts.timer || { enabled: true, label: 'Timer guaranteed', price: 0 };
    const timerChk = document.getElementById('adm-timer-enabled');
    if (timerChk) timerChk.checked = timer.enabled !== false;
    const timerLbl = document.getElementById('adm-timer-label');
    if (timerLbl) timerLbl.value = timer.label || 'Timer guaranteed';
    const timerPrc = document.getElementById('adm-timer-price');
    if (timerPrc) timerPrc.value = timer.price !== undefined ? timer.price : 0;

    this.renderModalTraders(opts.lootTraders || []);
    this.renderModalModes(opts.completionMethods || []);

    // Populate Tab 4: Extras & Dungeons
    this.renderModalExtras(opts.extras || []);
    const dungeonsArea = document.getElementById('adm-dungeons-textarea');
    if (dungeonsArea) {
      const dList = opts.dungeons && opts.dungeons.length > 0 ? opts.dungeons : [
        'Random Dungeon (Más Rápido)',
        'The Stonevault',
        'City of Threads',
        'The Dawnbreaker',
        'Ara-Kara, City of Echoes',
        'Grim Batol',
        'The Necrotic Wake',
        'Mists of Tirna Scithe',
        'Siege of Boralus'
      ];
      dungeonsArea.value = dList.join('\n');
    }

    // Populate Tab 5: Estimates, Badges & Discounts
    const est = opts.estimates || { start: '10-15 min', execution: '15-30 min' };
    const estStart = document.getElementById('adm-est-start');
    if (estStart) estStart.value = est.start || '10-15 min';
    const estExec = document.getElementById('adm-est-exec');
    if (estExec) estExec.value = est.execution || '15-30 min';

    const badges = opts.heroBadges || ['311 ilvl Gear', '318 Weekly Vault', 'FREE Timer & Traders'];
    const b1 = document.getElementById('adm-badge-1');
    if (b1) b1.value = badges[0] || '';
    const b2 = document.getElementById('adm-badge-2');
    if (b2) b2.value = badges[1] || '';
    const b3 = document.getElementById('adm-badge-3');
    if (b3) b3.value = badges[2] || '';

    const volD = document.getElementById('adm-vol-discount');
    if (volD) volD.value = opts.volumeDiscount !== undefined ? opts.volumeDiscount : 5;
    const cshB = document.getElementById('adm-cashback-pct');
    if (cshB) cshB.value = opts.cashbackPercent !== undefined ? opts.cashbackPercent : 5;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  saveProductFromAdmin() {
    const idVal = document.getElementById('adm-prod-id').value.trim();
    const name = document.getElementById('adm-prod-name').value.trim();
    const cat = document.getElementById('adm-prod-cat').value;
    const price = Number(document.getElementById('adm-prod-price').value);
    const icon = document.getElementById('adm-prod-icon').value.trim() || 'fa-dungeon';
    const badge = document.getElementById('adm-prod-badge').value.trim() || 'Popular';
    const desc = document.getElementById('adm-prod-desc').value.trim();

    if (!name || isNaN(price) || price <= 0) {
      alert('Por favor completa un nombre válido y precio mayor a 0.');
      return;
    }

    // Compile dynamic options from all 5 tabs
    const keyRows = Array.from(document.querySelectorAll('.adm-key-row'));
    const compiledKeyLevels = keyRows.map(row => {
      const lvlVal = row.querySelector('.adm-key-lvl')?.value.trim() || '';
      const prcVal = Number(row.querySelector('.adm-key-prc')?.value) || 0;
      const isRec = !!row.querySelector('.adm-key-rec')?.checked;
      const numLevel = Number(lvlVal.replace(/[^0-9]/g, '')) || lvlVal;
      return { level: numLevel, price: prcVal, recommended: isRec };
    }).filter(k => k.level !== '');

    const timerOpt = {
      enabled: !!document.getElementById('adm-timer-enabled')?.checked,
      label: document.getElementById('adm-timer-label')?.value.trim() || 'Timer guaranteed',
      price: Number(document.getElementById('adm-timer-price')?.value) || 0
    };

    const traderRows = Array.from(document.querySelectorAll('.adm-trader-row'));
    const compiledTraders = traderRows.map(row => ({
      label: row.querySelector('.adm-trader-lbl')?.value.trim() || '',
      price: Number(row.querySelector('.adm-trader-prc')?.value) || 0
    })).filter(t => t.label);

    const modeRows = Array.from(document.querySelectorAll('.adm-mode-row'));
    const compiledModes = modeRows.map(row => ({
      label: row.querySelector('.adm-mode-lbl')?.value.trim() || '',
      price: Number(row.querySelector('.adm-mode-prc')?.value) || 0,
      tag: row.querySelector('.adm-mode-tag')?.value.trim() || ''
    })).filter(m => m.label);

    const extraRows = Array.from(document.querySelectorAll('.adm-extra-row'));
    const compiledExtras = extraRows.map(row => ({
      label: row.querySelector('.adm-extra-lbl')?.value.trim() || '',
      price: Number(row.querySelector('.adm-extra-prc')?.value) || 0
    })).filter(e => e.label);

    const dungeonsRaw = document.getElementById('adm-dungeons-textarea')?.value || '';
    const compiledDungeons = dungeonsRaw.split('\n').map(d => d.trim()).filter(Boolean);

    const compiledEstimates = {
      start: document.getElementById('adm-est-start')?.value.trim() || '10-15 min',
      execution: document.getElementById('adm-est-exec')?.value.trim() || '15-30 min'
    };

    const compiledHeroBadges = [
      document.getElementById('adm-badge-1')?.value.trim(),
      document.getElementById('adm-badge-2')?.value.trim(),
      document.getElementById('adm-badge-3')?.value.trim()
    ].filter(Boolean);

    const compiledVolumeDiscount = Number(document.getElementById('adm-vol-discount')?.value) || 0;
    const compiledCashbackPercent = Number(document.getElementById('adm-cashback-pct')?.value) || 0;

    const compiledOptions = {
      keyLevels: compiledKeyLevels,
      timer: timerOpt,
      lootTraders: compiledTraders,
      completionMethods: compiledModes,
      extras: compiledExtras,
      dungeons: compiledDungeons,
      estimates: compiledEstimates,
      heroBadges: compiledHeroBadges,
      volumeDiscount: compiledVolumeDiscount,
      cashbackPercent: compiledCashbackPercent
    };

    if (idVal) {
      // Edit existing
      const existing = this.services.find(s => s.id === idVal);
      if (existing) {
        existing.name = name;
        existing.category = cat;
        existing.basePrice = price;
        existing.icon = icon;
        existing.badge = badge;
        existing.description = desc;
        existing.options = Object.assign({}, existing.options || {}, compiledOptions);
      }
    } else {
      // Create new
      const cleanSlug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || ('prod-' + Date.now());
      const newService = {
        id: cleanSlug,
        name: name,
        category: cat,
        basePrice: price,
        icon: icon,
        badge: badge,
        description: desc,
        page: 'product?id=' + cleanSlug,
        options: compiledOptions
      };
      this.services.unshift(newService);
    }

    this.saveServices();
    this.renderAdminProductsManager();
    const modal = document.getElementById('admin-product-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    this.showToast(`¡Producto "${name}" y todas sus opciones guardadas con éxito!`, 'success');
  }

  deleteProduct(productId) {
    const svc = this.services.find(s => s.id === productId);
    if (!svc) return;

    if (confirm(`¿Estás seguro de eliminar el producto "${svc.name}" (#${productId}) del catálogo?`)) {
      this.services = this.services.filter(s => s.id !== productId);
      this.saveServices();
      this.renderAdminProductsManager();
      this.showToast(`Producto ${svc.name} eliminado del catálogo.`, 'info');
    }
  }

  // 2. SUPERVISIÓN DE TODAS LAS ÓRDENES
  renderAdminOrders(statusFilter = 'ALL', searchFilter = '') {
    const container = document.getElementById('admin-orders-table');
    if (!container) return;

    // Keep badge count strictly reflecting available orders
    const availableOrdersCount = (this.orders || []).filter(o => o && (o.status === 'AVAILABLE' || o.status === 'BIDDING')).length;
    const badgeOrders = document.getElementById('badge-orders-count');
    if (badgeOrders) badgeOrders.textContent = availableOrdersCount;

    let list = this.orders;
    if (statusFilter !== 'ALL') {
      list = list.filter(o => o.status === statusFilter);
    }
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      list = list.filter(o => 
        o.id.toLowerCase().includes(q) || 
        o.serviceName.toLowerCase().includes(q) || 
        (o.clientName && o.clientName.toLowerCase().includes(q)) ||
        (o.clientDiscord && o.clientDiscord.toLowerCase().includes(q))
      );
    }

    if (list.length === 0) {
      container.innerHTML = `<tr><td colspan="8" class="py-6 text-center text-xs text-stone-500">No hay órdenes que coincidan con el filtro actual.</td></tr>`;
      return;
    }

    container.innerHTML = list.map(o => {
      const bidsList = (o.bids && Array.isArray(o.bids)) ? o.bids : [];
      const bidsCount = bidsList.length;
      const bestBid = bidsCount > 0 ? [...bidsList].sort((a,b) => Number(a.bidAmount) - Number(b.bidAmount))[0] : null;

      return `
      <tr class="hover:bg-[#190a33] transition-colors text-xs text-stone-300 border-b border-stone-800/40">
        <td class="py-4 px-5 font-mono-gaming text-[#a855f7] font-bold whitespace-nowrap text-xs">#${o.id}</td>
        <td class="py-4 px-5">
          <div class="font-bold text-white text-sm leading-snug">${o.serviceName}</div>
          <div class="text-[11px] text-stone-400 mt-1">${o.details || (o.region + ' | ' + o.completionMethod)}</div>
        </td>
        <td class="py-4 px-5">
          <div class="font-semibold text-[#f3e8ff] text-xs">${o.clientName || 'Cliente'}</div>
          <div class="text-[11px] text-stone-400 font-mono-gaming mt-0.5">${o.clientDiscord || o.clientId || 'N/A'}</div>
        </td>
        <td class="py-4 px-5 font-mono-gaming font-bold text-white text-sm whitespace-nowrap">
          $${Number(o.totalPrice).toFixed(2)}
        </td>
        <td class="py-4 px-5 font-mono-gaming text-[#f3e8ff] font-bold text-sm whitespace-nowrap">
          $${(Number(o.companyShare) || (Number(o.totalPrice) * 0.70)).toFixed(2)}
        </td>
        <td class="py-4 px-5 min-w-[210px]">
          ${o.status === 'COMPLETED' ? `
            <div class="font-semibold text-emerald-300 flex items-center gap-1.5 text-xs">
              <i class="fa-solid fa-bolt text-[11px] text-[#a855f7]"></i>
              <span>${o.assignedBooster ? o.assignedBooster.username : 'Sin asignar'}</span>
            </div>
            ${o.assignedBooster ? `<div class="text-[10px] font-mono-gaming text-[#a855f7] mt-0.5">Pago: $${(Number(o.assignedBooster.payout) || Number(o.boosterPayout)).toFixed(2)} (${o.boosterPayoutRate || 30}%)</div>` : ''}
          ` : `
            <div class="flex flex-col gap-1.5">
              <select onchange="app.adminAssignBoosterDropdown('${o.id}', this.value)" 
                      class="w-full bg-[#140827] border ${o.assignedBooster ? 'border-emerald-600/60 text-emerald-300' : 'border-stone-700/80 text-stone-300'} rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:border-[#a855f7] outline-none cursor-pointer hover:bg-[#1d0d38] transition-all">
                <option value="" ${!o.assignedBooster ? 'selected' : ''}>-- Sin Asignar (En Bolsa) --</option>
                ${(this.boosters || []).map(b => {
                  const bName = b.username || b.discord_id || 'Booster';
                  const isSelected = o.assignedBooster && (
                    (o.assignedBooster.username && o.assignedBooster.username.toLowerCase() === bName.toLowerCase()) ||
                    (o.assignedBooster.discordId && b.discord_id && String(o.assignedBooster.discordId) === String(b.discord_id))
                  );
                  const tag = b.role ? ` [${b.role}]` : '';
                  return `<option value="${b.discord_id || bName}" ${isSelected ? 'selected' : ''}>⚡ ${bName}${tag}</option>`;
                }).join('')}
              </select>
              ${o.assignedBooster ? `
                <div class="flex items-center justify-between text-[10px] px-1">
                  <span class="text-stone-400">Pago:</span>
                  <span class="font-mono-gaming text-[#a855f7] font-bold">$${(Number(o.assignedBooster.payout) || Number(o.boosterPayout)).toFixed(2)} (${o.boosterPayoutRate || 30}%)</span>
                </div>
              ` : `
                <span class="text-[10px] text-stone-500 italic px-1">Visible en Bolsa de Pedidos</span>
              `}
              ${bidsCount > 0 && o.status !== 'COMPLETED' ? `
                <div class="mt-1 flex items-center justify-between bg-amber-950/70 border border-amber-600/60 rounded-lg px-2 py-1 text-[10px]">
                  <span class="text-amber-300 font-bold flex items-center gap-1">
                    <i class="fa-solid fa-crown text-amber-400"></i> ${bidsCount} Puja${bidsCount > 1 ? 's' : ''} (Mejor: $${Number(bestBid.bidAmount).toFixed(2)})
                  </span>
                  <button onclick="app.openAdminOrderModal('${o.id}')" class="text-[#fcefc2] underline hover:text-white font-bold ml-1 cursor-pointer">Ver/Aceptar</button>
                </div>
              ` : ''}
            </div>
          `}
        </td>
        <td class="py-4 px-5 text-center whitespace-nowrap">
          <span class="inline-flex items-center justify-center whitespace-nowrap px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider ${
            o.status === 'COMPLETED' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 shadow-sm' :
            o.status === 'PENDING_APPROVAL' ? 'bg-amber-950/90 text-amber-300 border border-amber-600/70 shadow-sm animate-pulse' :
            o.status === 'IN_PROGRESS' ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60 shadow-sm' :
            o.status === 'BIDDING' ? 'bg-amber-950/90 text-amber-300 border border-amber-500/70 shadow-sm animate-pulse' :
            'bg-[#281b13] text-[#a855f7] border border-[#a855f7]/40 shadow-sm'
          }">
            ${o.status === 'COMPLETED' ? 'COMPLETADA' : o.status === 'PENDING_APPROVAL' ? 'EN REVISIÓN' : o.status === 'IN_PROGRESS' ? 'EN PROCESO' : o.status === 'BIDDING' ? 'SUBASTA / PUJAS' : 'DISPONIBLE'}
          </span>
        </td>
        <td class="py-4 px-5 text-right whitespace-nowrap">
          <div class="flex items-center justify-end gap-2">
            <button onclick="app.openAdminOrderModal('${o.id}')" class="px-3 py-1.5 rounded-xl bg-[#241042] hover:bg-[#33175c] text-[#f3e8ff] border border-[#a855f7]/40 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer" title="Ver Detalles y Chat">
              <i class="fa-solid fa-eye text-[#a855f7] text-xs"></i>
              <span>Auditar</span>
            </button>
            ${bidsCount > 0 && o.status !== 'COMPLETED' ? `
              <button onclick="app.openAdminOrderModal('${o.id}')" class="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 font-bold text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer" title="Ver y aceptar ofertas de boosters">
                <i class="fa-solid fa-gavel text-amber-400"></i>
                <span class="hidden xl:inline">Pujas (${bidsCount})</span>
              </button>
            ` : ''}
            ${o.status === 'PENDING_APPROVAL' ? `
              <button onclick="app.adminApproveOrderCompletion('${o.id}')" class="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer" title="Aprobar reporte y liberar pago al booster">
                <i class="fa-solid fa-circle-check"></i>
                <span class="hidden xl:inline">Aprobar</span>
              </button>
              <button onclick="app.adminRejectOrderCompletion('${o.id}')" class="px-2.5 py-1.5 rounded-xl bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-700/60 font-bold text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer" title="Rechazar reporte y devolver a En Proceso">
                <i class="fa-solid fa-rotate-left"></i>
                <span class="hidden xl:inline">Rechazar</span>
              </button>
            ` : ''}
            ${o.assignedBooster && o.status !== 'COMPLETED' ? `
              <button onclick="app.adminUnassignBoosterOrder('${o.id}')" class="px-2.5 py-1.5 rounded-xl bg-rose-950/70 hover:bg-rose-900/90 text-rose-300 border border-rose-700/60 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer" title="Quitar orden al booster y devolverla a la Bolsa de Pedidos">
                <i class="fa-solid fa-user-xmark text-rose-400"></i>
                <span class="hidden xl:inline">Quitar Booster</span>
              </button>
            ` : ''}
            ${o.status !== 'COMPLETED' && o.status !== 'PENDING_APPROVAL' ? `
              <button onclick="app.adminCompleteOrder('${o.id}')" class="w-8 h-8 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800 flex items-center justify-center font-bold text-xs shadow-sm transition-all cursor-pointer" title="Completar Orden">
                <i class="fa-solid fa-check"></i>
              </button>
            ` : ''}
            <button onclick="app.adminDeleteOrder('${o.id}')" class="w-8 h-8 rounded-xl bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800/60 flex items-center justify-center font-bold text-xs shadow-sm transition-all cursor-pointer" title="Eliminar Orden">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>
      `;
    }).join('');
  }

  filterAdminOrdersByStatus(status) {
    document.querySelectorAll('.admin-order-filter-btn').forEach(b => {
      if (b.dataset.filter === status) {
        b.classList.add('active', 'text-white', 'bg-[#271d15]');
        b.classList.remove('text-stone-400');
      } else {
        b.classList.remove('active', 'text-white', 'bg-[#271d15]');
        b.classList.add('text-stone-400');
      }
    });
    this.currentAdminOrderStatusFilter = status;
    const searchVal = document.getElementById('admin-orders-search')?.value || '';
    this.renderAdminOrders(status, searchVal);
  }

  searchAdminOrders(val) {
    this.renderAdminOrders(this.currentAdminOrderStatusFilter || 'ALL', val);
  }

  adminResetAllOrdersToAvailable() {
    if (!this.checkAdminPermission()) return;
    if (confirm('¿Restablecer TODAS las órdenes a DISPONIBLES y sin booster asignado en Firebase?')) {
      (this.orders || []).forEach(o => {
        if (o) {
          o.status = 'AVAILABLE';
          o.assignedBooster = null;
          o.isOnAccount = false;
          o.completionReport = null;
        }
      });
      this.saveOrders();
      this.renderAdminOverview();
      this.renderAdminOrders(this.currentAdminOrderStatusFilter || 'ALL');
      this.renderProOrderFeed();
      this.renderProMyOrders();
      this.renderChatList();
      if (typeof this.renderClientOrders === 'function') this.renderClientOrders();
      this.showToast('Todas las órdenes se han restablecido a DISPONIBLES en la nube.', 'success');
    }
  }

  finalizeOrderCompletion(orderId, approverName = 'Administración') {
    const o = this.orders.find(x => x.id === orderId);
    if (!o) return;

    o.status = 'COMPLETED';
    o.completedAt = new Date().toISOString();
    o.isOnAccount = false;
    o.approvedBy = approverName;

    const payout = Number(o.assignedBooster?.payout || o.boosterPayout || 0);

    // Credit payout to booster
    if (o.assignedBooster) {
      const bIdx = (this.boosters || []).findIndex(b => 
        (b.discord_id && o.assignedBooster.discordId && String(b.discord_id) === String(o.assignedBooster.discordId)) ||
        (b.username && o.assignedBooster.username && b.username.toLowerCase() === o.assignedBooster.username.toLowerCase()) ||
        (b.id && o.assignedBooster.id && String(b.id) === String(o.assignedBooster.id))
      );
      if (bIdx >= 0) {
        this.boosters[bIdx].balance = (Number(this.boosters[bIdx].balance) || 0) + payout;
        this.boosters[bIdx].points = (Number(this.boosters[bIdx].points) || 0) + 1;
        this.saveBoosters();
      }

      if (this.currentUser && (
        (this.currentUser.discordId && o.assignedBooster.discordId && String(this.currentUser.discordId) === String(o.assignedBooster.discordId)) ||
        (this.currentUser.username && o.assignedBooster.username && this.currentUser.username.toLowerCase() === o.assignedBooster.username.toLowerCase())
      )) {
        this.currentUser.balance = (Number(this.currentUser.balance) || 0) + payout;
        this.currentUser.points = (Number(this.currentUser.points) || 0) + 1;
        this.saveUser();
      }
    }

    o.chat = o.chat || [];
    o.chat.push({
      sender: 'system',
      author: 'Notificación del Sistema',
      message: `🎉 ¡Servicio verificado y aprobado por ${approverName}! La orden #${o.id} ha sido completada con éxito. Se acreditaron $${payout.toFixed(2)} al saldo del booster.`,
      timestamp: new Date().toISOString()
    });

    this.saveOrders();
    this.renderAdminOverview();
    if (typeof this.renderAdminOrders === 'function') this.renderAdminOrders(this.currentAdminOrderStatusFilter || 'ALL');
    if (typeof this.renderProOrderFeed === 'function') this.renderProOrderFeed();
    if (typeof this.renderProMyOrders === 'function') this.renderProMyOrders();
    if (typeof this.renderProWallet === 'function') this.renderProWallet();
    if (typeof this.renderChatList === 'function') this.renderChatList();
    if (typeof this.renderClientOrders === 'function') this.renderClientOrders();

    if (this.liveChatChannel) {
      try {
        this.liveChatChannel.postMessage({ type: 'ORDER_COMPLETED', orderId: o.id, approver: approverName });
      } catch (e) {}
    }
  }

  adminCompleteOrder(orderId) {
    const o = this.orders.find(x => x.id === orderId);
    if (!o) return;
    if (confirm(`¿Marcar la orden #${orderId} como COMPLETADA administrativamente y liberar el pago al booster?`)) {
      this.finalizeOrderCompletion(orderId, 'Administrador');
      this.showToast(`Orden #${orderId} completada administrativamente.`, 'success');
    }
  }

  adminApproveOrderCompletion(orderId) {
    const o = this.orders.find(x => x.id === orderId);
    if (!o) return;
    const payout = (o.assignedBooster?.payout || o.boosterPayout || 0).toFixed(2);
    if (confirm(`¿Aprobar el reporte de finalización de la orden #${orderId}?\n\nSe marcará como COMPLETADA y se acreditarán $${payout} al saldo del booster.`)) {
      this.finalizeOrderCompletion(orderId, 'Administrador');
      this.showToast(`¡Reporte aprobado y orden #${orderId} completada!`, 'success');
    }
  }

  adminRejectOrderCompletion(orderId) {
    const o = this.orders.find(x => x.id === orderId);
    if (!o) return;
    const reason = prompt(`Indica el motivo del rechazo del reporte para la orden #${orderId}:`, 'Faltan objetivos acordados o evidencia insuficiente');
    if (reason === null) return;

    o.status = 'IN_PROGRESS';
    o.completionReport = null;
    o.chat = o.chat || [];
    o.chat.push({
      sender: 'system',
      author: 'Administración Mythic',
      message: `⚠️ El reporte de finalización fue RECHAZADO por la administración.\nMotivo: ${reason}\nLa orden ha vuelto a estado EN PROCESO.`,
      timestamp: new Date().toISOString()
    });

    this.saveOrders();
    this.renderAdminOverview();
    if (typeof this.renderAdminOrders === 'function') this.renderAdminOrders(this.currentAdminOrderStatusFilter || 'ALL');
    if (typeof this.renderProMyOrders === 'function') this.renderProMyOrders();
    if (typeof this.renderChatList === 'function') this.renderChatList();

    if (this.liveChatChannel) {
      try {
        this.liveChatChannel.postMessage({ type: 'ORDER_REJECTED', orderId: o.id, reason });
      } catch (e) {}
    }

    this.showToast(`Reporte rechazado. La orden #${orderId} regresó a En Proceso.`, 'info');
  }

  adminDeleteOrder(orderId) {
    const o = (this.orders || []).find(x => x.id === orderId);
    if (!o) return;
    if (confirm(`¿Seguro que quieres eliminar la orden #${orderId}?`)) {
      this.orders = this.orders.filter(x => x.id !== orderId);
      this.saveOrders();
      if (this.db) {
        this.db.collection('orders').doc(orderId).delete().catch(e => console.warn('Firestore delete order error:', e));
      }
      this.renderAdminOverview();
      this.renderAdminOrders(this.currentAdminOrderStatusFilter || 'ALL');
      this.showToast(`Orden #${orderId} eliminada correctamente.`, 'info');
    }
  }

  adminAssignBoosterDropdown(orderId, boosterIdOrUsername) {
    if (!this.checkAdminPermission()) return;
    const o = (this.orders || []).find(x => x.id === orderId);
    if (!o) return;

    if (!boosterIdOrUsername) {
      this.adminUnassignBoosterOrder(orderId);
      return;
    }

    const booster = (this.boosters || []).find(b => 
      (b.discord_id && String(b.discord_id) === String(boosterIdOrUsername)) ||
      (b.username && b.username.toLowerCase() === String(boosterIdOrUsername).toLowerCase())
    );

    const bName = booster ? booster.username : boosterIdOrUsername;
    const bDiscord = booster ? (booster.discord_id || booster.discordId || '') : '';

    const confirmed = confirm(`¿Deseas asignar manualmente la orden #${o.id} al booster "${bName}"?`);
    if (!confirmed) {
      this.renderAdminOrders(this.currentAdminOrderStatusFilter || 'ALL');
      return;
    }

    o.status = 'IN_PROGRESS';
    o.assignedBooster = {
      username: bName,
      discordId: bDiscord,
      payout: o.boosterPayout || (o.totalPrice * 0.3)
    };

    o.chat = o.chat || [];
    o.chat.push({
      sender: 'system',
      author: 'Administración Mythic',
      message: `⚡ Asignación Administrativa: La administración ha asignado el pedido #${o.id} al booster ${bName}.`,
      timestamp: new Date().toISOString()
    });

    this.saveOrders();
    this.renderAdminOverview();
    this.renderAdminOrders(this.currentAdminOrderStatusFilter || 'ALL');
    this.renderProOrderFeed();
    this.renderProMyOrders();
    this.renderChatList();
    if (typeof this.renderClientOrders === 'function') this.renderClientOrders();

    if (this.liveChatChannel) {
      try {
        this.liveChatChannel.postMessage({ type: 'ORDER_CLAIMED', orderId: o.id, booster: bName });
      } catch (e) {}
    }

    this.showToast(`Orden #${o.id} asignada con éxito a ${bName}.`, 'success');
  }

  adminAcceptBid(orderId, boosterIdOrUsername, acceptedAmount) {
    if (!this.checkAdminPermission()) return;

    const order = (this.orders || []).find(o => o.id === orderId);
    if (!order) return;

    const booster = (this.boosters || []).find(b => 
      (b.discord_id && String(b.discord_id) === String(boosterIdOrUsername)) ||
      (b.username && b.username.toLowerCase() === String(boosterIdOrUsername).toLowerCase()) ||
      (b.id && String(b.id) === String(boosterIdOrUsername))
    );

    const bName = booster ? (booster.username || booster.discord_id) : String(boosterIdOrUsername);
    const bDiscord = booster ? (booster.discord_id || booster.username) : String(boosterIdOrUsername);
    const payout = Number(acceptedAmount);

    const confirmed = confirm(`¿Deseas aceptar la oferta de $${payout.toFixed(2)} del booster "${bName}" y asignarle la orden #${order.id}?`);
    if (!confirmed) return;

    order.assignedBooster = {
      username: bName,
      discordId: bDiscord,
      payout: payout,
      id: booster ? booster.id : null
    };
    order.boosterPayout = payout;
    if (order.totalPrice && order.totalPrice > 0) {
      order.boosterPayoutRate = Math.round((payout / order.totalPrice) * 100);
      order.companyShare = Math.max(0, order.totalPrice - payout);
    }
    order.status = 'IN_PROGRESS';
    order.acceptedBid = {
      boosterName: bName,
      boosterDiscordId: bDiscord,
      bidAmount: payout,
      acceptedAt: new Date().toISOString(),
      acceptedBy: (this.currentUser && this.currentUser.username) || 'Staff'
    };

    if (!order.chat) order.chat = [];
    order.chat.push({
      sender: 'system',
      author: 'Administración Mythic',
      message: `🔨 OFERTA ACEPTADA: La administración ha aceptado la oferta de puja del booster ${bName} por un monto acordado de $${payout.toFixed(2)}. La orden pasa a estar EN PROCESO.`,
      timestamp: new Date().toISOString()
    });

    this.saveOrders();

    if (this.liveChatChannel) {
      try {
        this.liveChatChannel.postMessage({
          type: 'ORDER_CLAIMED',
          orderId: order.id,
          booster: bName
        });
      } catch (e) {}
    }

    this.showToast(`¡Oferta aceptada! Orden #${order.id} asignada a ${bName} por $${payout.toFixed(2)}.`, 'success');

    const modal = document.getElementById('admin-order-modal');
    if (modal) modal.classList.add('hidden');

    this.renderAdminOverview();
    if (typeof this.renderAdminOrders === 'function') {
      this.renderAdminOrders(this.currentAdminOrderStatusFilter || 'ALL');
    }
    if (typeof this.renderProOrderFeed === 'function') {
      this.renderProOrderFeed();
    }
    if (typeof this.renderProMyOrders === 'function') {
      this.renderProMyOrders();
    }
    if (typeof this.renderChatList === 'function') {
      this.renderChatList();
    }
    if (typeof this.renderClientOrders === 'function') {
      this.renderClientOrders();
    }
  }

  adminUnassignBoosterOrder(orderId) {
    if (!this.checkAdminPermission()) return;

    const o = this.orders.find(x => x.id === orderId);
    if (!o) return;

    if (!o.assignedBooster) {
      this.showToast('Esta orden no tiene un booster asignado.', 'info');
      return;
    }

    const boosterName = o.assignedBooster.username || 'Booster';

    const confirmed = confirm(
      `¿Deseas quitar la orden #${o.id} al booster "${boosterName}" y devolverla a la Bolsa de Pedidos?\n\n` +
      `• La orden volverá a estar disponible inmediatamente en la Bolsa de Pedidos para que cualquier otro booster la tome.\n` +
      `• Se enviará un aviso automático en el chat compartido del pedido notificando que se retiró al booster y se espera un nuevo asignado.`
    );

    if (!confirmed) {
      this.renderAdminOrders(this.currentAdminOrderStatusFilter || 'ALL');
      return;
    }

    // Reset order assignment and status to available pool
    o.status = 'AVAILABLE';
    o.assignedBooster = null;
    o.isOnAccount = false;

    // Send automatic notification in shared chat between booster and client
    o.chat = o.chat || [];
    o.chat.push({
      sender: 'system',
      author: 'Sistema Mythic Progression',
      message: `⚠️ Aviso del Sistema: Se ha desasignado al booster actual (${boosterName}) de este pedido. La orden ha vuelto a la Bolsa de Pedidos y está a la espera de que otro booster tome la orden.`,
      timestamp: new Date().toISOString()
    });

    this.saveOrders();
    this.renderAdminOverview();
    this.renderAdminOrders(this.currentAdminOrderStatusFilter || 'ALL');
    this.renderProOrderFeed();
    this.renderProMyOrders();
    this.renderChatList();
    if (this.activeClientChatOrderId === o.id) {
      this.renderClientChatsList();
    }

    // Broadcast sync to other open tabs
    if (this.liveChatChannel) {
      try {
        this.liveChatChannel.postMessage({ type: 'ORDER_UNASSIGNED', orderId: o.id, boosterName });
      } catch (e) {}
    }

    this.showToast(`Orden #${o.id} retirada de ${boosterName} y devuelta a la Bolsa de Pedidos.`, 'success');
  }

  openAdminOrderModal(orderId) {
    const o = this.orders.find(x => x.id === orderId);
    if (!o) return;

    const modal = document.getElementById('admin-order-modal');
    const content = document.getElementById('admin-order-modal-content');
    if (!modal || !content) return;

    const orderBids = Array.isArray(o.bids) ? o.bids : [];
    // Lowest bid is the best offer for the company (reverse auction)
    const sortedBids = [...orderBids].sort((a,b) => Number(a.bidAmount) - Number(b.bidAmount));
    const bestBid = sortedBids.length > 0 ? sortedBids[0] : null;

    content.innerHTML = `
      <div class="flex items-center justify-between pb-4 border-b border-stone-800 mb-4">
        <div>
          <h3 class="text-base font-bold text-[#f3e8ff] font-cinzel">Auditoría de Orden #${o.id}</h3>
          <span class="text-xs text-[#a855f7]">${o.serviceName}</span>
        </div>
        <button onclick="document.getElementById('admin-order-modal').classList.add('hidden')" class="w-8 h-8 rounded-full bg-stone-900 text-stone-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="space-y-4 text-xs">
        <div class="grid grid-cols-2 gap-3 bg-[#150f0c] p-4 rounded-xl border border-stone-800">
          <div><span class="text-stone-500">Cliente:</span> <strong class="text-white">${o.clientName}</strong> (${o.clientDiscord})</div>
          <div><span class="text-stone-500">Booster:</span> <strong class="text-[#a855f7]">${o.assignedBooster ? o.assignedBooster.username : 'Sin Asignar'}</strong></div>
          <div><span class="text-stone-500">Personaje:</span> <strong class="text-stone-200">${o.characterName || 'N/A'} (${o.realm || 'US'})</strong></div>
          <div><span class="text-stone-500">Modalidad:</span> <strong class="text-stone-200">${o.completionMethod || 'Self-play'}</strong></div>
          <div><span class="text-stone-500">Total Pagado:</span> <strong class="text-white font-mono-gaming text-sm">$${o.totalPrice.toFixed(2)}</strong></div>
          <div><span class="text-stone-500">Reparto (70/30):</span> <strong class="text-[#f3e8ff] font-mono-gaming">$${(o.companyShare || o.totalPrice * 0.7).toFixed(2)} / $${(o.boosterPayout || o.totalPrice * 0.3).toFixed(2)}</strong></div>
        </div>

        ${o.status === 'PENDING_APPROVAL' ? `
          <div class="p-3.5 rounded-xl bg-amber-950/50 border border-amber-500/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div class="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
                <i class="fa-solid fa-clock"></i> Reporte de Finalización Pendiente de Revisión
              </div>
              <div class="text-[11px] text-stone-300 mt-1">
                Booster: <strong class="text-white">${o.completionReport?.booster || o.assignedBooster?.username || 'Booster'}</strong>
                ${o.completionReport?.notes ? `<br><span class="italic text-stone-300 font-mono text-[10px]">"${o.completionReport.notes}"</span>` : ''}
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button onclick="app.adminApproveOrderCompletion('${o.id}'); document.getElementById('admin-order-modal').classList.add('hidden');" class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-md cursor-pointer">
                <i class="fa-solid fa-circle-check"></i> Aprobar y Pagar
              </button>
              <button onclick="app.adminRejectOrderCompletion('${o.id}'); document.getElementById('admin-order-modal').classList.add('hidden');" class="px-2.5 py-1.5 rounded-xl bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-700/60 font-bold text-xs flex items-center gap-1 shadow-md cursor-pointer">
                <i class="fa-solid fa-rotate-left"></i> Rechazar
              </button>
            </div>
          </div>
        ` : ''}

        <!-- SECCIÓN DE SUBASTA Y PUJAS (BIDS) -->
        <div class="bg-[#120822] border ${orderBids.length > 0 ? 'border-amber-600/60 shadow-lg shadow-amber-950/30' : 'border-stone-800'} rounded-xl p-4">
          <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h4 class="font-bold text-white text-xs flex items-center gap-2">
              <span class="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center text-xs">
                <i class="fa-solid fa-gavel"></i>
              </span>
              <span>Ofertas de Boosters (Subasta / Bids)</span>
              <span class="px-2 py-0.5 rounded-full ${orderBids.length > 0 ? 'bg-amber-950 text-amber-300 border border-amber-700/50' : 'bg-stone-900 text-stone-500'} font-mono-gaming font-bold text-[10px]">
                ${orderBids.length} oferta${orderBids.length === 1 ? '' : 's'}
              </span>
            </h4>
            ${bestBid ? `
              <div class="text-[11px] text-amber-300 bg-amber-950/80 border border-amber-600/60 px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-bold shadow-sm">
                <i class="fa-solid fa-crown text-amber-400"></i>
                <span>Mejor postor (menor oferta): <strong class="font-mono-gaming text-emerald-400 text-xs">$${Number(bestBid.bidAmount).toFixed(2)}</strong> (${bestBid.boosterName})</span>
              </div>
            ` : ''}
          </div>

          ${orderBids.length > 0 ? `
            <div class="space-y-2">
              ${sortedBids.map((b, idx) => {
                const isBest = idx === 0;
                const isCurrentAssigned = o.assignedBooster && (
                  (o.assignedBooster.username && o.assignedBooster.username.toLowerCase() === b.boosterName.toLowerCase()) ||
                  (o.assignedBooster.discordId && b.boosterDiscordId && String(o.assignedBooster.discordId) === String(b.boosterDiscordId))
                );
                return `
                  <div class="p-3 rounded-xl ${isBest ? 'bg-[#221035] border border-amber-500/60 shadow-md' : 'bg-[#180a2c] border border-stone-800'} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full ${isBest ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50' : 'bg-stone-800 text-stone-400'} flex items-center justify-center font-bold font-mono text-xs">
                        ${isBest ? '<i class="fa-solid fa-crown text-amber-400 text-xs"></i>' : '#' + (idx + 1)}
                      </div>
                      <div>
                        <div class="flex items-center gap-2 flex-wrap">
                          <strong class="text-white text-sm">${b.boosterName}</strong>
                          <span class="text-[10px] px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-700/40 font-semibold">${b.boosterRole || 'Booster'}</span>
                          ${isBest ? `<span class="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold uppercase tracking-wider flex items-center gap-1"><i class="fa-solid fa-crown text-[9px]"></i> Mejor Postor</span>` : ''}
                          ${isCurrentAssigned ? `<span class="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-600/50 font-bold">Asignado Actualmente</span>` : ''}
                        </div>
                        <div class="text-[10px] text-stone-400 mt-0.5">
                          Enviada el: ${b.timestamp ? new Date(b.timestamp).toLocaleString() : 'Reciente'}
                        </div>
                      </div>
                    </div>

                    <div class="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      <div class="text-right">
                        <span class="text-[10px] text-stone-400 block uppercase">Oferta</span>
                        <span class="font-mono-gaming font-bold text-base ${isBest ? 'text-emerald-400' : 'text-stone-300'}">$${Number(b.bidAmount).toFixed(2)}</span>
                      </div>
                      ${isCurrentAssigned ? `
                        <button disabled class="px-3 py-1.5 rounded-xl bg-emerald-950/80 text-emerald-300 border border-emerald-800 text-xs font-bold opacity-80 cursor-default flex items-center gap-1.5">
                          <i class="fa-solid fa-check"></i> Asignado
                        </button>
                      ` : `
                        <button onclick="app.adminAcceptBid('${o.id}', '${b.boosterDiscordId || b.boosterName}', ${b.bidAmount})" 
                                class="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]">
                          <i class="fa-solid fa-circle-check"></i>
                          <span>Aceptar y Asignar</span>
                        </button>
                      `}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          ` : `
            <div class="text-center py-3 text-stone-500 text-xs italic">
              No hay ofertas de boosters registradas para esta orden todavía.
            </div>
          `}
        </div>

        <div>
          <h4 class="font-bold text-stone-300 mb-2 flex items-center gap-2">
            <i class="fa-solid fa-comments text-[#a855f7]"></i>
            <span>Historial del Chat Entre Cliente y Booster:</span>
          </h4>
          <div class="bg-[#100521] border border-stone-800 rounded-xl p-3 max-h-56 overflow-y-auto space-y-2">
            ${o.chat && o.chat.length ? o.chat.map(m => {
              if (m.sender === 'system') {
                return `
                  <div class="p-2.5 rounded-lg bg-[#1a1208] text-amber-200 border border-amber-700/50 text-center text-xs">
                    <span class="inline-flex items-center gap-1 font-bold text-amber-400 text-[10px] mb-1">
                      <i class="fa-solid fa-triangle-exclamation"></i> AVISO DEL SISTEMA
                    </span>
                    <div class="leading-relaxed">${m.message}</div>
                    <span class="text-[9px] text-stone-400 mt-1 block">${new Date(m.timestamp).toLocaleTimeString()}</span>
                  </div>
                `;
              }
              const info = this.formatChatAuthorDisplay(m);
              return `
              <div class="p-2.5 rounded-lg ${info.bubbleClass} border border-stone-800/80">
                <div class="flex items-center justify-between text-[10px] mb-1" style="color: ${info.authorColor}">
                  <span class="font-bold flex items-center gap-1.5">
                    <span>${info.cleanName}</span>
                    ${info.badgeHtml}
                  </span>
                  <span class="text-stone-400">${new Date(m.timestamp).toLocaleTimeString()}</span>
                </div>
                <div class="text-stone-200 text-xs break-words">${m.message}</div>
              </div>
            `;}).join('') : '<div class="text-stone-500 text-center py-4">No hay mensajes en este chat aún.</div>'}
          </div>
        </div>

        <div class="pt-4 border-t border-stone-800 flex items-center justify-between gap-2">
          ${o.assignedBooster && o.status !== 'COMPLETED' ? `
            <button onclick="app.adminUnassignBoosterOrder('${o.id}'); document.getElementById('admin-order-modal').classList.add('hidden');" class="px-3.5 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-700/70 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-rose-950/40">
              <i class="fa-solid fa-user-xmark text-rose-400"></i>
              <span>Quitar Orden al Booster y Devolver a Bolsa</span>
            </button>
          ` : '<div></div>'}
          <button onclick="document.getElementById('admin-order-modal').classList.add('hidden')" class="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 font-bold text-xs cursor-pointer transition-colors">Cerrar</button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  // ==========================================
  // BASE DE DATOS HISTÓRICA DE ÓRDENES (GOOGLE SHEETS - 1,900 REGISTROS)
  // ==========================================
  initHistoryOrdersPanel() {
    this.historyFiltered = [...this.historyOrders];
    this.historyCurrentPage = 1;
    this.renderHistorySummaryStats();
    this.renderHistoryOrdersTable();
    this.renderHistoryPagination();
  }

  renderHistorySummaryStats() {
    const totalCount = this.historyOrders.length;
    if (totalCount === 0) return;

    const usdOrders = this.historyOrders.filter(o => o.metodo_pago !== 'Gold');
    const goldOrders = this.historyOrders.filter(o => o.metodo_pago === 'Gold');
    const totalUsd = usdOrders.reduce((sum, o) => sum + (o.monto_real || 0), 0);
    const totalGold = goldOrders.reduce((sum, o) => sum + (o.monto_real || 0), 0);
    const paidCount = this.historyOrders.filter(o => o.pagado).length;
    const boosterPaidCount = this.historyOrders.filter(o => o.booster_pagado).length;

    const elTotal = document.getElementById('hist-total-count');
    if (elTotal) elTotal.textContent = totalCount.toLocaleString();

    const elUsd = document.getElementById('hist-total-usd');
    if (elUsd) elUsd.textContent = `$${totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const elGold = document.getElementById('hist-total-gold');
    if (elGold) elGold.textContent = `${(totalGold / 1000000).toFixed(1)}M Gold`;

    const elPaid = document.getElementById('hist-paid-count');
    if (elPaid) elPaid.textContent = `${paidCount.toLocaleString()} (${Math.round(paidCount / totalCount * 100)}%)`;

    const elBoosterPaid = document.getElementById('hist-booster-paid-count');
    if (elBoosterPaid) elBoosterPaid.textContent = `${boosterPaidCount.toLocaleString()} (${Math.round(boosterPaidCount / totalCount * 100)}%)`;
  }

  applyHistoryFilters() {
    const term = (this.historySearchTerm || '').trim().toLowerCase();
    const cartera = this.historyFilterCartera || 'ALL';
    const metodo = this.historyFilterMetodo || 'ALL';
    const estado = this.historyFilterEstado || 'ALL';

    this.historyFiltered = this.historyOrders.filter(o => {
      // 1. Search term (ID, Trabajo, Booster name, Cartera, Supplier)
      if (term) {
        const matchesId = (o.id || '').toLowerCase().includes(term);
        const matchesTrabajo = (o.trabajo || '').toLowerCase().includes(term);
        const matchesCartera = (o.cartera || '').toLowerCase().includes(term);
        const matchesSupplier = (o.supplier || '').toLowerCase().includes(term);
        const matchesBoosters = (
          (o.tank || '').toLowerCase().includes(term) ||
          (o.heal || '').toLowerCase().includes(term) ||
          (o.dps1 || '').toLowerCase().includes(term) ||
          (o.dps2 || '').toLowerCase().includes(term)
        );
        if (!matchesId && !matchesTrabajo && !matchesCartera && !matchesSupplier && !matchesBoosters) {
          return false;
        }
      }

      // 2. Cartera filter
      if (cartera !== 'ALL') {
        if ((o.cartera || '').toLowerCase() !== cartera.toLowerCase()) {
          return false;
        }
      }

      // 3. Metodo / Currency filter
      if (metodo === 'USD') {
        if (o.metodo_pago === 'Gold') return false;
      } else if (metodo === 'GOLD') {
        if (o.metodo_pago !== 'Gold') return false;
      } else if (metodo !== 'ALL') {
        if ((o.metodo_pago || '').toLowerCase() !== metodo.toLowerCase()) return false;
      }

      // 4. Estado filter
      if (estado === 'CLIENT_PAID') {
        if (!o.pagado) return false;
      } else if (estado === 'CLIENT_PENDING') {
        if (o.pagado) return false;
      } else if (estado === 'BOOSTER_PAID') {
        if (!o.booster_pagado) return false;
      } else if (estado === 'BOOSTER_PENDING') {
        if (o.booster_pagado) return false;
      }

      return true;
    });

    this.historyCurrentPage = 1;
    this.renderHistoryOrdersTable();
    this.renderHistoryPagination();
  }

  onHistorySearchInput(val) {
    this.historySearchTerm = val;
    this.applyHistoryFilters();
  }

  onHistoryCarteraSelect(val) {
    this.historyFilterCartera = val;
    this.applyHistoryFilters();
  }

  onHistoryMetodoSelect(val) {
    this.historyFilterMetodo = val;
    this.applyHistoryFilters();
  }

  onHistoryEstadoSelect(val) {
    this.historyFilterEstado = val;
    this.applyHistoryFilters();
  }

  changeHistoryPageSize(size) {
    this.historyPageSize = Number(size) || 25;
    this.historyCurrentPage = 1;
    this.renderHistoryOrdersTable();
    this.renderHistoryPagination();
  }

  changeHistoryPage(page) {
    const maxPage = Math.ceil(this.historyFiltered.length / this.historyPageSize) || 1;
    this.historyCurrentPage = Math.max(1, Math.min(page, maxPage));
    this.renderHistoryOrdersTable();
    this.renderHistoryPagination();
  }

  renderHistoryOrdersTable() {
    const tbody = document.getElementById('history-orders-table');
    if (!tbody) return;

    if (this.historyFiltered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="py-12 text-center text-xs text-stone-500">
            <i class="fa-solid fa-magnifying-glass text-2xl text-stone-600 mb-2 block"></i>
            No se encontraron órdenes históricas con los filtros seleccionados.
          </td>
        </tr>
      `;
      return;
    }

    const startIdx = (this.historyCurrentPage - 1) * this.historyPageSize;
    const endIdx = startIdx + this.historyPageSize;
    const pageItems = this.historyFiltered.slice(startIdx, endIdx);

    const carteraColors = {
      'Sky': 'bg-amber-950/60 text-amber-300 border-amber-800/40',
      'Wow vendor': 'bg-blue-950/60 text-blue-300 border-blue-800/40',
      'Epic': 'bg-purple-950/60 text-purple-300 border-purple-800/40',
      'King': 'bg-yellow-950/60 text-yellow-300 border-yellow-800/40',
      'Over': 'bg-emerald-950/60 text-emerald-300 border-emerald-800/40',
      'Conquest': 'bg-red-950/60 text-red-300 border-red-800/40',
      'Barreiro': 'bg-stone-900 text-stone-300 border-stone-800',
      'Miguel': 'bg-[#291e16] text-[#a855f7] border-[#a855f7]/30'
    };

    tbody.innerHTML = pageItems.map(o => {
      const isGold = o.metodo_pago === 'Gold';
      const carteraClass = carteraColors[o.cartera] || 'bg-stone-900 text-stone-300 border-stone-800';

      // Team party chips
      const party = [];
      if (o.tank) party.push(`<span class="px-1.5 py-0.5 rounded bg-[#17110c] text-blue-300 border border-blue-900/40 text-[10px]" title="Tank"><i class="fa-solid fa-shield text-[9px] mr-1"></i>${o.tank}</span>`);
      if (o.heal) party.push(`<span class="px-1.5 py-0.5 rounded bg-[#17110c] text-emerald-300 border border-emerald-900/40 text-[10px]" title="Healer"><i class="fa-solid fa-heart text-[9px] mr-1"></i>${o.heal}</span>`);
      if (o.dps1) party.push(`<span class="px-1.5 py-0.5 rounded bg-[#17110c] text-amber-300 border border-amber-900/40 text-[10px]" title="DPS 1"><i class="fa-solid fa-crosshairs text-[9px] mr-1"></i>${o.dps1}</span>`);
      if (o.dps2) party.push(`<span class="px-1.5 py-0.5 rounded bg-[#17110c] text-amber-300 border border-amber-900/40 text-[10px]" title="DPS 2"><i class="fa-solid fa-crosshairs text-[9px] mr-1"></i>${o.dps2}</span>`);

      return `
        <tr class="hover:bg-[#1a130e] transition-colors text-xs text-stone-300">
          <td class="py-3 px-4">
            <div class="font-mono-gaming font-bold text-white text-[11px]">${o.id}</div>
            <div class="text-[10px] text-stone-500 flex items-center gap-1 mt-0.5">
              <i class="fa-solid fa-calendar-day text-[9px] text-[#a855f7]"></i>
              <span>${o.fecha || 'N/A'}</span>
            </div>
          </td>
          <td class="py-3 px-4">
            <span class="px-2.5 py-1 rounded-full text-[10px] font-bold border ${carteraClass} inline-block">
              ${o.cartera}
            </span>
          </td>
          <td class="py-3 px-4 max-w-xs">
            <div class="font-bold text-[#f3e8ff] truncate flex items-center gap-1.5">
              <i class="fa-solid fa-dungeon text-[#a855f7] text-[10px]"></i>
              <span title="${o.trabajo}">${o.trabajo}</span>
            </div>
            ${o.supplier ? `<span class="text-[10px] text-stone-500 block">Supplier: ${o.supplier}</span>` : ''}
          </td>
          <td class="py-3 px-4">
            <div class="font-mono-gaming font-bold ${isGold ? 'text-amber-400' : 'text-white'} text-sm">
              ${isGold ? `${o.monto_real.toLocaleString()} Gold` : `$${o.monto_real.toFixed(2)}`}
            </div>
            <span class="text-[9px] px-1.5 py-0.2 rounded bg-stone-900 text-stone-400 border border-stone-800 uppercase font-semibold">
              ${o.metodo_pago || 'Binance'}
            </span>
          </td>
          <td class="py-3 px-4 font-mono-gaming text-[11px]">
            ${o.cu > 0 ? `<div class="text-[#f3e8ff] font-semibold">C/U: ${isGold ? o.cu.toLocaleString() : '$' + o.cu.toFixed(2)}</div>` : ''}
            ${o.total_pagar > 0 ? `<div class="text-[#a855f7] text-[10px]">Total: ${isGold ? o.total_pagar.toLocaleString() : '$' + o.total_pagar.toFixed(2)}</div>` : '<span class="text-stone-600">-</span>'}
          </td>
          <td class="py-3 px-4">
            <div class="flex flex-wrap gap-1 max-w-[200px]">
              ${party.length ? party.join('') : '<span class="text-stone-600 italic text-[10px]">Sin party</span>'}
            </div>
          </td>
          <td class="py-3 px-4">
            <div class="space-y-1">
              <span class="px-2 py-0.5 rounded text-[9px] font-bold block w-fit ${o.pagado ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40' : 'bg-red-950/60 text-red-300 border border-red-800/40'}">
                ${o.pagado ? 'Cliente: Pagado' : 'Cliente: Pendiente'}
              </span>
              <span class="px-2 py-0.5 rounded text-[9px] font-bold block w-fit ${o.booster_pagado ? 'bg-blue-950/60 text-blue-400 border border-blue-800/40' : 'bg-amber-950/60 text-amber-300 border border-amber-800/40'}">
                ${o.booster_pagado ? 'Booster: Cobrado' : 'Booster: Pendiente'}
              </span>
            </div>
          </td>
          <td class="py-3 px-4 text-right">
            <button onclick="app.viewHistoryOrderModal('${encodeURIComponent(o.id)}')" class="px-2.5 py-1.5 rounded-lg bg-[#241042] hover:bg-[#33175c] text-[#f3e8ff] border border-[#a855f7]/40 font-bold text-[11px] flex items-center gap-1.5 ml-auto shadow-sm" title="Ver todos los detalles">
              <i class="fa-solid fa-file-invoice text-[#a855f7]"></i>
              <span>Ficha</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  renderHistoryPagination() {
    const total = this.historyFiltered.length;
    const maxPage = Math.ceil(total / this.historyPageSize) || 1;
    const startIdx = total === 0 ? 0 : (this.historyCurrentPage - 1) * this.historyPageSize + 1;
    const endIdx = Math.min(startIdx + this.historyPageSize - 1, total);

    const info = document.getElementById('hist-pagination-info');
    if (info) {
      info.textContent = total === 0 
        ? '0 órdenes encontradas' 
        : `Mostrando registros ${startIdx.toLocaleString()} a ${endIdx.toLocaleString()} de ${total.toLocaleString()} órdenes`;
    }

    const indicator = document.getElementById('hist-page-indicator');
    if (indicator) {
      indicator.textContent = `Página ${this.historyCurrentPage.toLocaleString()} de ${maxPage.toLocaleString()}`;
    }

    const btnPrev = document.getElementById('hist-btn-prev');
    if (btnPrev) btnPrev.disabled = this.historyCurrentPage <= 1;

    const btnFirst = document.getElementById('hist-btn-first');
    if (btnFirst) btnFirst.disabled = this.historyCurrentPage <= 1;

    const btnNext = document.getElementById('hist-btn-next');
    if (btnNext) btnNext.disabled = this.historyCurrentPage >= maxPage;

    const btnLast = document.getElementById('hist-btn-last');
    if (btnLast) btnLast.disabled = this.historyCurrentPage >= maxPage;
  }

  viewHistoryOrderModal(encodedId) {
    const orderId = decodeURIComponent(encodedId);
    const o = this.historyOrders.find(x => x.id === orderId);
    if (!o) return;

    const modal = document.getElementById('admin-order-modal');
    const content = document.getElementById('admin-order-modal-content');
    if (!modal || !content) return;

    const isGold = o.metodo_pago === 'Gold';

    content.innerHTML = `
      <div class="flex items-center justify-between pb-4 border-b border-stone-800 mb-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-[#241042] border border-[#a855f7]/50 flex items-center justify-center text-[#a855f7] text-lg">
            <i class="fa-solid fa-file-invoice"></i>
          </div>
          <div>
            <h3 class="text-base font-bold text-[#f3e8ff] font-cinzel leading-tight">Ficha de Orden: ${o.id}</h3>
            <span class="text-xs text-[#a855f7] font-semibold">${o.cartera} | Fecha: ${o.fecha || 'N/A'}</span>
          </div>
        </div>
        <button onclick="document.getElementById('admin-order-modal').classList.add('hidden')" class="w-8 h-8 rounded-full bg-stone-900 text-stone-400 hover:text-white flex items-center justify-center">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="space-y-4 text-xs">
        <!-- Servicio / Trabajo -->
        <div class="bg-[#150f0c] p-4 rounded-xl border border-stone-800 space-y-2">
          <span class="text-[10px] text-stone-500 uppercase font-bold tracking-wider block">Trabajo / Servicio Ejecutado:</span>
          <div class="text-sm font-bold text-white">${o.trabajo}</div>
          ${o.cliente ? `<div class="text-stone-400"><span class="text-stone-500">Cliente Registrado:</span> ${o.cliente}</div>` : ''}
          ${o.supplier ? `<div class="text-stone-400"><span class="text-stone-500">Supplier / Proveedor:</span> <strong class="text-white">${o.supplier}</strong></div>` : ''}
        </div>

        <!-- Desglose Financiero de Google Sheets -->
        <div class="bg-[#150f0c] p-4 rounded-xl border border-stone-800">
          <span class="text-[10px] text-stone-500 uppercase font-bold tracking-wider block mb-3">Auditoría Financiera:</span>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div class="p-2.5 rounded-lg bg-[#1b0c36] border border-stone-800/80">
              <span class="text-[10px] text-stone-500 block">Monto Real Total:</span>
              <strong class="text-sm font-mono-gaming ${isGold ? 'text-amber-400' : 'text-white'}">
                ${isGold ? o.monto_real.toLocaleString() + ' Gold' : '$' + o.monto_real.toFixed(2)}
              </strong>
            </div>
            <div class="p-2.5 rounded-lg bg-[#1b0c36] border border-stone-800/80">
              <span class="text-[10px] text-stone-500 block">Pago C/U por Booster:</span>
              <strong class="text-sm font-mono-gaming text-[#f3e8ff]">
                ${isGold ? o.cu.toLocaleString() + ' Gold' : '$' + o.cu.toFixed(2)}
              </strong>
            </div>
            <div class="p-2.5 rounded-lg bg-[#1b0c36] border border-stone-800/80">
              <span class="text-[10px] text-stone-500 block">Total a Pagar:</span>
              <strong class="text-sm font-mono-gaming text-[#a855f7]">
                ${isGold ? o.total_pagar.toLocaleString() + ' Gold' : '$' + o.total_pagar.toFixed(2)}
              </strong>
            </div>
            ${o.mp_margin > 0 ? `
              <div class="p-2.5 rounded-lg bg-[#1b0c36] border border-stone-800/80">
                <span class="text-[10px] text-stone-500 block">Margen Mythic (MP):</span>
                <strong class="text-xs font-mono-gaming text-emerald-400">$${o.mp_margin.toFixed(2)}</strong>
              </div>
            ` : ''}
            ${o.monto_booster_40 > 0 ? `
              <div class="p-2.5 rounded-lg bg-[#1b0c36] border border-stone-800/80">
                <span class="text-[10px] text-stone-500 block">Monto Booster (40%):</span>
                <strong class="text-xs font-mono-gaming text-stone-300">$${o.monto_booster_40.toFixed(2)}</strong>
              </div>
            ` : ''}
            ${o.monto_booster_20 > 0 ? `
              <div class="p-2.5 rounded-lg bg-[#1b0c36] border border-stone-800/80">
                <span class="text-[10px] text-stone-500 block">Monto Booster (20%):</span>
                <strong class="text-xs font-mono-gaming text-stone-300">$${o.monto_booster_20.toFixed(2)}</strong>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Party Asignada -->
        <div class="bg-[#150f0c] p-4 rounded-xl border border-stone-800">
          <span class="text-[10px] text-stone-500 uppercase font-bold tracking-wider block mb-2">Equipo de Boosters (Party):</span>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div class="p-2 rounded-lg bg-[#160a30] border border-stone-800 text-center">
              <span class="text-[10px] text-blue-400 font-bold block"><i class="fa-solid fa-shield mr-1"></i>Tank</span>
              <strong class="text-white text-xs">${o.tank || 'Sin asignar'}</strong>
            </div>
            <div class="p-2 rounded-lg bg-[#160a30] border border-stone-800 text-center">
              <span class="text-[10px] text-emerald-400 font-bold block"><i class="fa-solid fa-heart mr-1"></i>Healer</span>
              <strong class="text-white text-xs">${o.heal || 'Sin asignar'}</strong>
            </div>
            <div class="p-2 rounded-lg bg-[#160a30] border border-stone-800 text-center">
              <span class="text-[10px] text-amber-400 font-bold block"><i class="fa-solid fa-crosshairs mr-1"></i>DPS 1</span>
              <strong class="text-white text-xs">${o.dps1 || 'Sin asignar'}</strong>
            </div>
            <div class="p-2 rounded-lg bg-[#160a30] border border-stone-800 text-center">
              <span class="text-[10px] text-amber-400 font-bold block"><i class="fa-solid fa-crosshairs mr-1"></i>DPS 2</span>
              <strong class="text-white text-xs">${o.dps2 || 'Sin asignar'}</strong>
            </div>
          </div>
        </div>

        <!-- Detalles de Discord & Estados -->
        <div class="grid grid-cols-2 gap-3 bg-[#150f0c] p-4 rounded-xl border border-stone-800">
          <div>
            <span class="text-stone-500 block">Over Discord:</span>
            <span class="text-stone-300 font-mono-gaming font-semibold">${o.over_discord || 'N/A'}</span>
          </div>
          <div>
            <span class="text-stone-500 block">Epic Discord:</span>
            <span class="text-stone-300 font-mono-gaming font-semibold">${o.epic_discord || 'N/A'}</span>
          </div>
          <div>
            <span class="text-stone-500 block">Estado Cliente:</span>
            <span class="font-bold ${o.pagado ? 'text-emerald-400' : 'text-red-400'}">${o.pagado ? '✅ PAGADO' : '❌ PENDIENTE'}</span>
          </div>
          <div>
            <span class="text-stone-500 block">Estado Booster:</span>
            <span class="font-bold ${o.booster_pagado ? 'text-emerald-400' : 'text-amber-400'}">${o.booster_pagado ? '✅ BOOSTER PAGADO' : '⏳ PENDIENTE'}</span>
          </div>
        </div>

        <div class="pt-4 border-t border-stone-800 flex justify-end gap-2">
          <button onclick="document.getElementById('admin-order-modal').classList.add('hidden')" class="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 font-bold text-xs uppercase">
            Cerrar Ficha
          </button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  exportHistoryOrdersCsv() {
    if (!this.historyFiltered.length) {
      this.showToast('No hay datos para exportar.', 'error');
      return;
    }

    const headers = ['N_Orden', 'Cartera', 'Fecha', 'Trabajo', 'Monto_Real', 'Moneda', 'Pago_CU', 'Total_Pagar', 'Tank', 'Heal', 'DPS1', 'DPS2', 'Cliente_Pagado', 'Booster_Pagado'];
    const rows = this.historyFiltered.map(o => [
      `"${(o.id || '').replace(/"/g, '""')}"`,
      `"${(o.cartera || '').replace(/"/g, '""')}"`,
      `"${o.fecha || ''}"`,
      `"${(o.trabajo || '').replace(/"/g, '""')}"`,
      o.monto_real,
      `"${o.metodo_pago || ''}"`,
      o.cu,
      o.total_pagar,
      `"${o.tank || ''}"`,
      `"${o.heal || ''}"`,
      `"${o.dps1 || ''}"`,
      `"${o.dps2 || ''}"`,
      o.pagado ? 'TRUE' : 'FALSE',
      o.booster_pagado ? 'TRUE' : 'FALSE'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `mythic_orders_history_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    this.showToast(`Exportadas ${this.historyFiltered.length} órdenes en CSV con éxito.`, 'success');
  }

  // 3. GESTIÓN Y BASE DE DATOS DE CLIENTES
  renderAdminClients(searchVal = '') {
    const container = document.getElementById('admin-clients-table');
    if (!container) return;

    let list = this.clients;
    if (searchVal) {
      const q = searchVal.toLowerCase();
      list = list.filter(c => 
        c.username.toLowerCase().includes(q) || 
        c.discordId.toLowerCase().includes(q) || 
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.battletag && c.battletag.toLowerCase().includes(q))
      );
    }

    if (list.length === 0) {
      container.innerHTML = `<tr><td colspan="8" class="py-6 text-center text-xs text-stone-500">No se encontraron clientes registrados con ese criterio.</td></tr>`;
      return;
    }

    container.innerHTML = list.map(c => `
      <tr class="hover:bg-[#190a33] transition-colors text-xs text-stone-300 border-b border-stone-800/40">
        <td class="py-4 px-5 font-bold text-white flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-[#241042] border border-[#a855f7]/40 flex items-center justify-center text-[#f3e8ff] font-bold text-xs shrink-0">
            ${c.username ? c.username[0].toUpperCase() : 'C'}
          </div>
          <div>
            <div class="text-white text-sm leading-snug">${c.username}</div>
            <div class="text-[11px] text-stone-500 font-mono-gaming">${c.id}</div>
          </div>
        </td>
        <td class="py-4 px-5 font-mono-gaming text-[#a855f7] font-semibold whitespace-nowrap">${c.discordId}</td>
        <td class="py-4 px-5">
          <div class="text-stone-300 text-xs">${c.email}</div>
          <div class="text-[11px] text-stone-500 font-mono-gaming mt-0.5">${c.battletag || 'N/A'}</div>
        </td>
        <td class="py-4 px-5 text-stone-300 whitespace-nowrap">${c.country || 'Global'}</td>
        <td class="py-4 px-5 font-mono-gaming font-bold text-white whitespace-nowrap text-center">${c.totalOrders || 0}</td>
        <td class="py-4 px-5 font-mono-gaming font-bold text-emerald-400 whitespace-nowrap text-sm">$${(Number(c.totalSpent) || 0).toFixed(2)}</td>
        <td class="py-4 px-5 text-center whitespace-nowrap">
          <span class="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 text-[10px] font-bold">
            ${c.status || 'Activo'}
          </span>
        </td>
        <td class="py-4 px-5 text-right whitespace-nowrap">
          <button onclick="app.viewClientDetailsModal('${c.id}')" class="px-3 py-1.5 rounded-xl bg-[#241042] hover:bg-[#33175c] text-[#f3e8ff] border border-[#a855f7]/40 font-bold text-xs flex items-center gap-1.5 ml-auto shadow-sm transition-all">
            <i class="fa-solid fa-receipt text-[#a855f7]"></i>
            <span>Historial</span>
          </button>
        </td>
      </tr>
    `).join('');
  }

  filterAdminClients(val) {
    this.renderAdminClients(val);
  }

  viewClientDetailsModal(clientId) {
    const c = this.clients.find(x => x.id === clientId);
    if (!c) return;

    const modal = document.getElementById('admin-client-modal');
    const content = document.getElementById('admin-client-modal-content');
    if (!modal || !content) return;

    const clientOrders = this.orders.filter(o => o.clientId === c.id || (o.clientDiscord && o.clientDiscord === c.discordId));

    content.innerHTML = `
      <div class="flex items-center justify-between pb-4 border-b border-stone-800 mb-4">
        <div>
          <h3 class="text-base font-bold text-[#f3e8ff] font-cinzel">Perfil del Cliente: ${c.username}</h3>
          <span class="text-xs text-[#a855f7]">${c.discordId} | ${c.country}</span>
        </div>
        <button onclick="document.getElementById('admin-client-modal').classList.add('hidden')" class="w-8 h-8 rounded-full bg-stone-900 text-stone-400 hover:text-white flex items-center justify-center">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="space-y-4 text-xs">
        <div class="bg-[#150f0c] p-4 rounded-xl border border-stone-800 grid grid-cols-2 gap-3">
          <div><span class="text-stone-500">Correo Electrónico:</span> <span class="text-white block font-semibold">${c.email}</span></div>
          <div><span class="text-stone-500">BattleTag Blizzard:</span> <span class="text-white block font-semibold font-mono-gaming">${c.battletag || 'N/A'}</span></div>
          <div><span class="text-stone-500">Total Gastado:</span> <span class="text-emerald-400 block font-bold font-mono-gaming text-sm">$${(c.totalSpent || 0).toFixed(2)}</span></div>
          <div><span class="text-stone-500">Fecha de Registro:</span> <span class="text-stone-300 block">${c.joinedAt || '2026'}</span></div>
        </div>

        <div>
          <h4 class="font-bold text-stone-300 mb-2">Pedidos de este cliente (${clientOrders.length}):</h4>
          <div class="space-y-2 max-h-48 overflow-y-auto">
            ${clientOrders.length ? clientOrders.map(o => `
              <div class="p-2.5 rounded-lg bg-[#1a130e] border border-stone-800 flex items-center justify-between">
                <div>
                  <div class="font-bold text-white">#${o.id} - ${o.serviceName}</div>
                  <div class="text-[10px] text-stone-500">${new Date(o.createdAt).toLocaleDateString()} | ${o.status}</div>
                </div>
                <div class="text-right font-mono-gaming font-bold text-[#f3e8ff]">
                  $${o.totalPrice.toFixed(2)}
                </div>
              </div>
            `).join('') : '<div class="text-stone-500 text-center py-4">No hay órdenes registradas para este cliente aún.</div>'}
          </div>
        </div>

        <div class="pt-4 border-t border-stone-800 flex justify-end gap-2">
          <button onclick="document.getElementById('admin-client-modal').classList.add('hidden')" class="px-4 py-2 rounded-xl bg-stone-900 text-stone-300 font-bold text-xs">Cerrar</button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  // 4. GESTIÓN Y APROBACIÓN DE BOOSTERS
  // 4. GESTIÓN Y APROBACIÓN DE BOOSTERS
  renderAdminBoosters() {
    const container = document.getElementById('admin-boosters-table');
    if (!container) return;

    const approvalFilter = this.currentAdminBoosterFilter || 'ALL';
    const roleFilter = this.currentAdminBoosterRoleFilter || document.getElementById('admin-booster-role-filter')?.value || 'ALL';
    const searchVal = this.currentAdminBoosterSearch !== undefined ? this.currentAdminBoosterSearch : (document.getElementById('admin-boosters-search')?.value || '');

    let list = this.boosters || [];

    // 1. Approval Filter
    if (approvalFilter === 'APPROVED') {
      list = list.filter(b => b.approved);
    } else if (approvalFilter === 'PENDING') {
      list = list.filter(b => !b.approved);
    }

    // 2. Role Filter
    if (roleFilter && roleFilter !== 'ALL') {
      const rfLower = roleFilter.toLowerCase();
      list = list.filter(b => {
        const bRoles = Array.isArray(b.roles) && b.roles.length > 0 ? b.roles : [b.role || 'Booster'];
        return bRoles.some(r => r.toLowerCase().includes(rfLower)) || (b.role && b.role.toLowerCase().includes(rfLower));
      });
    }

    // 3. Search query
    if (searchVal) {
      const q = searchVal.trim().toLowerCase();
      list = list.filter(b => {
        const bRoles = Array.isArray(b.roles) && b.roles.length > 0 ? b.roles : [b.role || 'Booster'];
        return b.username.toLowerCase().includes(q) || 
          String(b.discord_id).includes(q) ||
          bRoles.some(r => r.toLowerCase().includes(q)) ||
          (b.email && b.email.toLowerCase().includes(q));
      });
    }

    // Update count in UI if badge exists
    const totalCountBadge = document.getElementById('admin-boosters-total-count');
    if (totalCountBadge) totalCountBadge.textContent = this.boosters.length;

    if (list.length === 0) {
      container.innerHTML = `
        <tr>
          <td colspan="7" class="py-12 text-center text-xs text-stone-500">
            <i class="fa-solid fa-users-slash text-2xl text-stone-600 mb-2 block"></i>
            No se encontraron boosters con el filtro seleccionado (${roleFilter !== 'ALL' ? roleFilter : 'Criterio actual'}).
          </td>
        </tr>
      `;
      return;
    }

    container.innerHTML = list.map(b => {
      const bRoles = Array.isArray(b.roles) && b.roles.length > 0 ? b.roles : [b.role || 'Booster'];
      const isOwner = b.discord_id === '443948776562884620' || (b.username && b.username.toLowerCase() === 'miguelb');
      return `
        <tr class="hover:bg-[#1e0d3d] transition-colors text-xs text-stone-300 border-b border-stone-800/40">
          <td class="py-4 px-5 font-mono-gaming text-stone-400 whitespace-nowrap">
            <span class="flex items-center gap-1.5">
              <i class="fa-brands fa-discord text-[#5865F2] text-xs"></i>
              <span>${b.discord_id}</span>
            </span>
          </td>
          <td class="py-4 px-5 font-bold text-white flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-full bg-[#28114d] border border-[#a855f7]/30 flex items-center justify-center text-xs text-[#f3e8ff] shrink-0 font-bold overflow-hidden shadow-inner">
              ${b.avatar ? `<img src="${b.avatar}" class="w-full h-full object-cover">` : (b.username ? b.username[0].toUpperCase() : 'B')}
            </div>
            <div>
              <div class="text-white text-sm font-bold flex items-center gap-1.5">
                <span>${b.username}</span>
                ${isOwner ? '<span class="text-[9px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono font-bold">OWNER</span>' : ''}
              </div>
              <div class="text-[10px] text-stone-500 font-normal">${b.email || 'Discord Sync'}</div>
            </div>
          </td>
          <td class="py-4 px-5 min-w-[210px]">
            <div class="flex flex-wrap items-center gap-1.5">
              ${this.renderBoosterRoleBadges(bRoles)}
            </div>
          </td>
          <td class="py-4 px-5 font-mono-gaming text-[#f3e8ff] font-bold whitespace-nowrap">${b.points || 0} pts</td>
          <td class="py-4 px-5 text-stone-400 text-xs whitespace-nowrap">
            <span class="px-2 py-1 rounded bg-[#15092a] border border-stone-800 text-[11px] text-stone-300">
              ${b.payout_method || 'Binance Pay / USDT'}
            </span>
          </td>
          <td class="py-4 px-5 whitespace-nowrap text-center">
            ${b.approved ? `
              <span class="inline-flex items-center text-emerald-400 text-[11px] font-bold gap-1 bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-900/40">
                <i class="fa-solid fa-circle-check"></i>
                <span>Aprobado</span>
              </span>
            ` : `
              <span class="inline-flex items-center text-amber-400 text-[11px] font-bold gap-1 bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-900/40">
                <i class="fa-solid fa-clock"></i>
                <span>Pendiente</span>
              </span>
            `}
          </td>
          <td class="py-4 px-5 text-right whitespace-nowrap">
            <div class="flex items-center justify-end gap-1.5">
              ${!b.approved ? `
                <button onclick="app.approveBooster('${b.discord_id}')" class="px-3 py-1.5 rounded-xl purple-gradient-bg font-bold text-xs uppercase shadow-sm">
                  Aprobar
                </button>
              ` : ''}
              <button onclick="app.openEditBoosterRolesModal('${b.discord_id}')" class="px-3 py-1.5 rounded-xl bg-[#241a12] hover:bg-[#342418] border border-[#a855f7]/30 hover:border-[#a855f7] text-[#f3e8ff] font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm" title="Editar Multi-Roles">
                <i class="fa-solid fa-tags text-[11px] text-[#a855f7]"></i>
                <span>Roles</span>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  filterAdminBoostersByApproval(filter) {
    document.querySelectorAll('.admin-booster-filter-btn').forEach(b => {
      if (b.dataset.filter === filter) {
        b.classList.add('active', 'text-white', 'bg-[#271d15]');
        b.classList.remove('text-stone-400');
      } else {
        b.classList.remove('active', 'text-white', 'bg-[#271d15]');
        b.classList.add('text-stone-400');
      }
    });
    this.currentAdminBoosterFilter = filter;
    this.renderAdminBoosters();
  }

  filterAdminBoostersByRole(role) {
    this.currentAdminBoosterRoleFilter = role;
    this.renderAdminBoosters();
  }

  filterAdminBoosters(val) {
    this.currentAdminBoosterSearch = val;
    this.renderAdminBoosters();
  }

  approveBooster(discordId) {
    const b = this.boosters.find(x => x.discord_id === discordId);
    if (!b) return;
    b.approved = true;
    if (!b.roles || b.roles.length === 0) {
      b.roles = ['Booster'];
      b.role = 'Booster';
    }
    this.saveBoosters();
    this.renderAdminBoosters();
    this.showToast(`Booster ${b.username} aprobado por la administración.`, 'success');
  }

  openEditBoosterRolesModal(discordId) {
    const booster = this.boosters.find(x => x.discord_id === discordId);
    if (!booster) return;

    this.editingBoosterDiscordId = discordId;
    const nameEl = document.getElementById('modal-booster-role-name');
    const idEl = document.getElementById('modal-booster-role-id');
    const container = document.getElementById('modal-booster-role-checkboxes');
    const modal = document.getElementById('admin-booster-role-modal');

    if (nameEl) nameEl.textContent = `Roles de ${booster.username}`;
    if (idEl) idEl.textContent = `Discord ID: ${booster.discord_id}`;

    const currentRoles = Array.isArray(booster.roles) && booster.roles.length > 0 
      ? booster.roles 
      : [booster.role || 'Booster'];

    const availableRoles = [
      { id: 'Master Booster', label: '👑 Master Booster', desc: 'Rango máximo de boosting y prioridad en contratos' },
      { id: 'Elite Booster', label: '⭐ Elite Booster', desc: 'Booster con alto puntaje y rendimiento élite' },
      { id: 'Veteran Booster', label: '🎖️ Veteran Booster', desc: 'Booster veterano de largo recorrido' },
      { id: 'Gold Booster', label: '🪙 Gold Booster', desc: 'Especialista en farmeo de oro y transacciones WoW Gold' },
      { id: 'Booster', label: '⚡ Booster', desc: 'Rango estándar de ejecutor de servicios' },
      { id: 'Staff / Admin', label: '🛡️ Staff / Admin', desc: 'Permisos de administración, supervisión y gestión' },
      { id: 'Raider', label: '⚔️ Raider', desc: 'Miembro enfocado en contenido de Bandas / Míticas' },
      { id: 'Supplier', label: '📦 Supplier', desc: 'Proveedor logístico de recursos e ítems' }
    ];

    if (container) {
      container.innerHTML = availableRoles.map(roleObj => {
        const checked = currentRoles.some(r => r.toLowerCase().includes(roleObj.id.toLowerCase()) || roleObj.id.toLowerCase().includes(r.toLowerCase()));
        return `
          <label class="flex items-start gap-3 p-2.5 rounded-xl bg-[#19120c] hover:bg-[#240f40] border border-stone-800 transition-colors cursor-pointer select-none">
            <input type="checkbox" name="booster_roles" value="${roleObj.id}" ${checked ? 'checked' : ''} class="mt-1 accent-[#a855f7] w-4 h-4 rounded">
            <div class="flex-1">
              <div class="text-xs font-bold text-white">${roleObj.label}</div>
              <div class="text-[10px] text-stone-400">${roleObj.desc}</div>
            </div>
          </label>
        `;
      }).join('');
    }

    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  closeBoosterRoleModal() {
    const modal = document.getElementById('admin-booster-role-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    this.editingBoosterDiscordId = null;
  }

  saveBoosterRolesFromModal() {
    if (!this.editingBoosterDiscordId) return;
    const booster = this.boosters.find(x => x.discord_id === this.editingBoosterDiscordId);
    if (!booster) return;

    const checkedBoxes = Array.from(document.querySelectorAll('input[name="booster_roles"]:checked'));
    let selectedRoles = checkedBoxes.map(cb => cb.value);

    if (selectedRoles.length === 0) {
      selectedRoles = ['Booster'];
    }

    const hasStaff = selectedRoles.some(r => /admin|staff|gerente|soporte/i.test(r));
    booster.roles = selectedRoles;
    booster.role = selectedRoles.join(' & ');
    booster.isAdmin = hasStaff;
    booster.isStaff = hasStaff;

    // If editing the currently logged in user, synchronize session
    if (this.currentUser && this.currentUser.discordId === booster.discord_id) {
      this.currentUser.roles = selectedRoles;
      this.currentUser.role = booster.role;
      this.currentUser.isAdmin = hasStaff;
      this.currentUser.isStaff = hasStaff;
      this.currentUser.type = hasStaff ? 'admin' : 'booster';
      this.saveUser();
      this.renderHeader();
    }

    this.saveBoosters();
    this.renderAdminBoosters();
    this.closeBoosterRoleModal();
    this.showToast(`Roles de ${booster.username} actualizados con éxito.`, 'success');
  }

  renderBoosterRoleBadges(roles) {
    if (!roles || !Array.isArray(roles) || roles.length === 0) {
      return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#1e1711] text-stone-300 border border-stone-700/50"><i class="fa-solid fa-bolt text-[9px] text-[#ee914f]"></i> Booster</span>`;
    }

    return roles.map(role => {
      const r = String(role).trim();
      const rLower = r.toLowerCase();

      if (rLower.includes('master')) {
        return `<span class="notranslate inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#3a1d0d] text-[#ee914f] border border-[#ee914f]/50 shadow-[0_0_8px_rgba(238,145,79,0.3)]" translate="no"><i class="fa-solid fa-crown text-[9px] text-[#ee914f]"></i> ${r}</span>`;
      }
      if (rLower.includes('admin') || rLower.includes('staff') || rLower.includes('gerente')) {
        return `<span class="notranslate inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/70 text-rose-300 border border-rose-700/50 shadow-[0_0_8px_rgba(244,63,94,0.2)]" translate="no"><i class="fa-solid fa-shield-halved text-[9px] text-rose-400"></i> ${r}</span>`;
      }
      if (rLower.includes('elite')) {
        return `<span class="notranslate inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-950/60 text-purple-300 border border-purple-700/50" translate="no"><i class="fa-solid fa-star text-[9px] text-purple-400"></i> ${r}</span>`;
      }
      if (rLower.includes('veteran')) {
        return `<span class="notranslate inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950/60 text-cyan-300 border border-cyan-700/50" translate="no"><i class="fa-solid fa-medal text-[9px] text-cyan-400"></i> ${r}</span>`;
      }
      if (rLower.includes('gold')) {
        return `<span class="notranslate inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/60 text-[#fcefc2] border border-amber-600/50" translate="no"><i class="fa-solid fa-coins text-[9px] text-amber-400"></i> ${r}</span>`;
      }
      if (rLower.includes('raider')) {
        return `<span class="notranslate inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-950/60 text-blue-300 border border-blue-700/50" translate="no"><i class="fa-solid fa-shield text-[9px] text-blue-400"></i> ${r}</span>`;
      }
      if (rLower.includes('supplier')) {
        return `<span class="notranslate inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-700/50" translate="no"><i class="fa-solid fa-box text-[9px] text-emerald-400"></i> ${r}</span>`;
      }
      return `<span class="notranslate inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#1e1711] text-stone-300 border border-stone-700/50" translate="no"><i class="fa-solid fa-bolt text-[9px] text-[#ee914f]"></i> ${r}</span>`;
    }).join('');
  }

  isAdminOrGerente() {
    if (!this.currentUser) return false;
    if (this.currentUser.isAdmin === true || this.currentUser.isStaff === true) return true;
    if (this.currentUser.type === 'admin' || this.currentUser.type === 'staff') return true;

    const discordId = String(this.currentUser.discordId || this.currentUser.discord_id || '').trim();
    const username = (this.currentUser.username || '').trim().toLowerCase();
    const email = (this.currentUser.email || '').trim().toLowerCase();
    const role = (this.currentUser.role || '').trim().toLowerCase();

    // Permanent Admin & Staff IDs / Users
    if (discordId === '443948776562884620' || username === 'miguelb' || email === 'charquin50@gmail.com') return true;
    if (discordId === '238855576992481280' || discordId === '23885576992481280' || username === 'mollys' || email === 'jaiker.mencias@gmail.com') return true;

    if (Array.isArray(this.currentUser.roles)) {
      if (this.currentUser.roles.some(r => /admin|staff|gerente|soporte/i.test(r))) return true;
    }

    // Check against this.boosters
    if (this.boosters && Array.isArray(this.boosters)) {
      const match = this.boosters.find(b => 
        (discordId && b.discord_id && (String(b.discord_id) === discordId || String(b.discord_id).includes(discordId) || discordId.includes(String(b.discord_id)))) ||
        (email && b.email && b.email.toLowerCase() === email) ||
        (username && b.username && b.username.toLowerCase() === username)
      );
      if (match) {
        const hasStaff = (match.roles && match.roles.some(r => /admin|staff|gerente|soporte/i.test(r))) ||
          (match.role && /admin|staff|gerente|soporte/i.test(match.role)) ||
          match.isAdmin === true || match.isStaff === true;
        if (hasStaff) return true;
      }
    }

    return role.includes('admin') || role.includes('gerente') || role.includes('staff') || role.includes('soporte') || username.includes('admin') || username.includes('gerente');
  }

  isBooster() {
    if (!this.currentUser) return false;
    if (this.currentUser.isBooster === true) return true;
    if (this.currentUser.type === 'booster') return true;
    if (this.currentUser.discordId === '443948776562884620') return true;
    if (this.currentUser.type === 'admin' || this.currentUser.type === 'staff') return true;
    if (this.isAdminOrGerente()) return true;
    if (Array.isArray(this.currentUser.roles)) {
      if (this.currentUser.roles.some(r => /booster|raider|supplier|master|admin|staff|gerente/i.test(r))) return true;
    }
    const role = (this.currentUser.role || '').toLowerCase();
    return role.includes('booster') || role.includes('raider') || role.includes('supplier') || role.includes('master') || role.includes('admin') || role.includes('staff') || role.includes('gerente');
  }

  hasRole(roleName) {
    if (!this.currentUser) return false;
    const target = (roleName || '').toLowerCase();
    if (Array.isArray(this.currentUser.roles)) {
      if (this.currentUser.roles.some(r => r.toLowerCase().includes(target))) return true;
    }
    const role = (this.currentUser.role || '').toLowerCase();
    return role.includes(target);
  }

  isAdmin() {
    if (!this.currentUser) return false;
    if (this.currentUser.isAdmin === true || this.currentUser.isStaff === true) return true;
    if (this.currentUser.type === 'admin' || this.currentUser.type === 'staff') return true;

    const discordId = String(this.currentUser.discordId || this.currentUser.discord_id || '').trim();
    const username = (this.currentUser.username || '').trim().toLowerCase();
    const email = (this.currentUser.email || '').trim().toLowerCase();
    const role = (this.currentUser.role || '').trim().toLowerCase();
    const roles = Array.isArray(this.currentUser.roles) ? this.currentUser.roles.map(r => String(r).toLowerCase()) : [];

    if (discordId === '443948776562884620' || username === 'miguelb' || email === 'charquin50@gmail.com') return true;
    if (discordId === '238855576992481280' || discordId === '23885576992481280' || username === 'mollys' || email === 'jaiker.mencias@gmail.com') return true;

    // Check against this.boosters
    if (this.boosters && Array.isArray(this.boosters)) {
      const match = this.boosters.find(b => 
        (discordId && b.discord_id && (String(b.discord_id) === discordId || String(b.discord_id).includes(discordId) || discordId.includes(String(b.discord_id)))) ||
        (email && b.email && b.email.toLowerCase() === email) ||
        (username && b.username && b.username.toLowerCase() === username)
      );
      if (match) {
        const hasStaff = (match.roles && match.roles.some(r => /admin|staff|gerente|soporte/i.test(r))) ||
          (match.role && /admin|staff|gerente|soporte/i.test(match.role)) ||
          match.isAdmin === true || match.isStaff === true;
        if (hasStaff) return true;
      }
    }

    return (
      discordId === MythicApp.OWNER_DISCORD_ID ||
      role.includes('admin') ||
      role.includes('gerente') ||
      role.includes('staff') ||
      role.includes('soporte') ||
      role.includes('owner') ||
      role.includes('director') ||
      role.includes('ceo') ||
      roles.some(r => /admin|gerente|owner|director|ceo|staff|soporte/i.test(r))
    );
  }

  isStaffOnly() {
    if (!this.currentUser) return false;
    if (this.isAdmin()) return false;
    const role = (this.currentUser.role || '').trim().toLowerCase();
    const roles = Array.isArray(this.currentUser.roles) ? this.currentUser.roles.map(r => String(r).toLowerCase()) : [];
    return (
      this.currentUser.type === 'staff' ||
      role.includes('staff') ||
      role.includes('soporte') ||
      role.includes('moderador') ||
      roles.some(r => /staff|soporte|mod/i.test(r)) ||
      (this.currentUser.isAdmin === true && !this.isAdmin())
    );
  }

  getHighestUserRole(userOrBooster) {
    if (!userOrBooster) return 'Cliente';
    const discordId = String(userOrBooster.discordId || userOrBooster.discord_id || '').trim();
    if (discordId === MythicApp.OWNER_DISCORD_ID || (userOrBooster.username && userOrBooster.username.toLowerCase() === 'miguelb')) {
      return 'Master Booster & Admin';
    }

    const roles = Array.isArray(userOrBooster.roles) ? userOrBooster.roles : (userOrBooster.role ? [userOrBooster.role] : []);
    const rolesStr = (roles.join(' ') + ' ' + (userOrBooster.role || '')).toLowerCase();

    if (rolesStr.includes('master') && (rolesStr.includes('admin') || rolesStr.includes('staff'))) {
      return 'Master Booster & Admin';
    }
    if (rolesStr.includes('staff') || userOrBooster.isStaff || userOrBooster.type === 'staff') {
      return 'Staff';
    }
    if (rolesStr.includes('admin') || rolesStr.includes('gerente') || rolesStr.includes('owner') || userOrBooster.isAdmin) {
      return 'Admin';
    }
    if (rolesStr.includes('master')) {
      return 'Master Booster';
    }
    if (rolesStr.includes('elite')) {
      return 'Elite Booster';
    }
    if (rolesStr.includes('veteran')) {
      return 'Veteran Booster';
    }
    if (rolesStr.includes('gold')) {
      return 'Gold Booster';
    }
    if (rolesStr.includes('raider')) {
      return 'Raider';
    }
    if (rolesStr.includes('supplier')) {
      return 'Supplier';
    }
    if (userOrBooster.type === 'booster' || userOrBooster.isBooster || rolesStr.includes('booster')) {
      return 'Booster';
    }
    return 'Cliente';
  }

  getUserChatRole(user = this.currentUser) {
    return this.getHighestUserRole(user);
  }

  formatChatAuthorDisplay(msg) {
    if (!msg) return { author: '', cleanName: '', roleLabel: '', badgeHtml: '', bubbleClass: '', isSelf: false, authorColor: '#ee914f' };

    let author = String(msg.author || '').trim();
    let sender = String(msg.sender || '').toLowerCase().trim();

    // Clean name without parenthesized role
    const cleanName = author.replace(/\s*\([^)]*\)\s*$/, '').trim() || author;

    // Look up booster / user profile dynamically to resolve their true registered highest role
    let userOrBooster = null;
    if (msg.discordId) {
      userOrBooster = (this.boosters || []).find(b => String(b.discord_id) === String(msg.discordId));
    }
    if (!userOrBooster && cleanName) {
      userOrBooster = (this.boosters || []).find(b => 
        (b.username && b.username.toLowerCase() === cleanName.toLowerCase()) ||
        (b.email && b.email.toLowerCase().includes(cleanName.toLowerCase()))
      );
    }
    if (!userOrBooster && this.currentUser && this.currentUser.username && this.currentUser.username.toLowerCase() === cleanName.toLowerCase()) {
      userOrBooster = this.currentUser;
    }

    // Determine role label
    let roleLabel = 'Cliente';
    if (sender === 'system' || /sistema/i.test(author) || /notificaci[oó]n/i.test(author)) {
      roleLabel = 'Sistema';
    } else if (userOrBooster) {
      roleLabel = this.getHighestUserRole(userOrBooster);
    } else if (msg.role) {
      roleLabel = msg.role;
    } else {
      const match = author.match(/\(([^)]+)\)$/);
      if (match && match[1]) {
        roleLabel = match[1].trim();
      } else if (sender === 'admin' || /miguelb/i.test(author)) {
        roleLabel = 'Admin';
      } else if (sender === 'staff') {
        roleLabel = 'Staff';
      } else if (sender === 'booster') {
        roleLabel = 'Booster';
      } else {
        roleLabel = 'Cliente';
      }
    }

    // Check if sent by current viewer
    const myName = (this.currentUser?.username || '').toLowerCase().trim();
    const isSelf = myName && cleanName.toLowerCase() === myName;

    // Badges & styling per role
    let badgeHtml = '';
    let authorColor = '#ee914f';
    let bubbleClass = 'bg-[#18120d] text-stone-200 border border-stone-800';

    const rLower = roleLabel.toLowerCase();

    if (rLower === 'sistema') {
      authorColor = '#fbbf24';
      badgeHtml = `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-950/70 text-amber-300 border border-amber-600/50 shadow-sm"><i class="fa-solid fa-triangle-exclamation text-[8px] text-amber-400"></i> Sistema</span>`;
      bubbleClass = 'bg-[#1a1208] text-amber-100 border border-amber-700/50 shadow-sm';
    } else if (rLower.includes('master') && (rLower.includes('admin') || rLower.includes('staff'))) {
      authorColor = '#ee914f';
      badgeHtml = `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-[#3a1d0d] text-[#ee914f] border border-[#ee914f]/50 shadow-[0_0_8px_rgba(238,145,79,0.3)]"><i class="fa-solid fa-crown text-[8px] text-[#ee914f]"></i> Master & Admin</span>`;
      bubbleClass = 'bg-[#26170d] text-[#fcefc2] border border-[#ee914f]/40 shadow-sm';
    } else if (rLower.includes('staff')) {
      authorColor = '#38bdf8';
      badgeHtml = `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#0c2338] text-sky-200 border border-sky-500/40 shadow-sm"><i class="fa-solid fa-shield-halved text-[8px] text-sky-400"></i> Staff</span>`;
      bubbleClass = 'bg-[#0b1926] text-sky-100 border border-sky-600/35 shadow-sm shadow-sky-950/30';
    } else if (rLower.includes('admin') || rLower.includes('gerente')) {
      authorColor = '#c084fc';
      badgeHtml = `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-[#2d124d] text-purple-200 border border-purple-500/50 shadow-sm"><i class="fa-solid fa-crown text-[8px] text-amber-300"></i> Admin</span>`;
      bubbleClass = 'bg-[#1b0b2e] text-purple-100 border border-purple-600/40 shadow-sm shadow-purple-950/30';
    } else if (rLower.includes('master')) {
      authorColor = '#ee914f';
      badgeHtml = `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-[#3a1d0d] text-[#ee914f] border border-[#ee914f]/50 shadow-[0_0_8px_rgba(238,145,79,0.3)]"><i class="fa-solid fa-crown text-[8px] text-[#ee914f]"></i> Master Booster</span>`;
      bubbleClass = 'bg-[#26170d] text-[#fcefc2] border border-[#ee914f]/40 shadow-sm';
    } else if (rLower.includes('elite')) {
      authorColor = '#c084fc';
      badgeHtml = `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-950/60 text-purple-300 border border-purple-700/50 shadow-sm"><i class="fa-solid fa-star text-[8px] text-purple-400"></i> Elite Booster</span>`;
      bubbleClass = 'bg-[#1c0f33] text-purple-100 border border-purple-700/40 shadow-sm';
    } else if (rLower.includes('veteran')) {
      authorColor = '#67e8f9';
      badgeHtml = `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-950/60 text-cyan-300 border border-cyan-700/50"><i class="fa-solid fa-medal text-[8px] text-cyan-400"></i> Veteran Booster</span>`;
      bubbleClass = 'bg-[#0d2229] text-cyan-100 border border-cyan-700/40';
    } else if (rLower.includes('gold')) {
      authorColor = '#fbbf24';
      badgeHtml = `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-950/60 text-[#fcefc2] border border-amber-600/50"><i class="fa-solid fa-coins text-[8px] text-amber-400"></i> Gold Booster</span>`;
      bubbleClass = 'bg-[#241a0d] text-amber-100 border border-amber-700/40';
    } else if (rLower.includes('raider')) {
      authorColor = '#60a5fa';
      badgeHtml = `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-950/60 text-blue-300 border border-blue-700/50"><i class="fa-solid fa-shield text-[8px] text-blue-400"></i> Raider</span>`;
      bubbleClass = 'bg-[#0c1a2e] text-blue-100 border border-blue-700/40';
    } else if (rLower.includes('supplier')) {
      authorColor = '#34d399';
      badgeHtml = `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-700/50"><i class="fa-solid fa-box text-[8px] text-emerald-400"></i> Supplier</span>`;
      bubbleClass = 'bg-[#0c261a] text-emerald-100 border border-emerald-700/40';
    } else if (rLower.includes('booster')) {
      authorColor = '#ee914f';
      badgeHtml = `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#291e16] text-[#fcefc2] border border-[#ee914f]/40"><i class="fa-solid fa-bolt text-[8px] text-[#ee914f]"></i> Booster</span>`;
      bubbleClass = 'bg-[#261a12] text-[#fcefc2] border border-[#ee914f]/35';
    } else {
      authorColor = '#34d399';
      badgeHtml = `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-500/30"><i class="fa-solid fa-user text-[8px]"></i> Cliente</span>`;
      bubbleClass = 'bg-[#141210] text-stone-200 border border-stone-800';
    }

    return {
      author: `${cleanName} (${roleLabel})`,
      cleanName,
      roleLabel,
      badgeHtml,
      authorColor,
      bubbleClass,
      isSelf
    };
  }

  // ==========================================
  // HEADER & ROLES (STRICT ACCESS CONTROL)
  // ==========================================
  renderHeader() {
    this.renderLanguageSelector();

    // Dynamically toggle pro-sidebar-admin-link if on /pro page
    const sidebarAdminLink = document.getElementById('pro-sidebar-admin-link');
    if (sidebarAdminLink) {
      if (this.isAdminOrGerente()) {
        sidebarAdminLink.classList.remove('hidden');
      } else {
        sidebarAdminLink.classList.add('hidden');
      }
    }

    const userBadge = document.getElementById('user-session-badge');
    if (!userBadge) return;
    userBadge.classList.add('notranslate');
    userBadge.setAttribute('translate', 'no');

    if (!this.currentUser) {
      userBadge.innerHTML = `
        <button type="button" onclick="app.openAuthModal()" class="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl copper-gradient-bg font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-[#ee914f]/25 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer notranslate" translate="no">
          <i class="fa-solid fa-user text-xs"></i>
          <span class="notranslate" translate="no">Iniciar Sesión</span>
        </button>
      `;
      return;
    }

    // REQUIREMENT: Boton en el header que SOLO puedan ver los admin y gerentes
    if (this.isAdminOrGerente()) {
      const avatarSrc = this.currentUser.avatar || localStorage.getItem('mp_discord_avatar_backup') || '';
      const avatarHtml = avatarSrc
        ? `<img src="${avatarSrc}" alt="Avatar" class="w-full h-full object-cover rounded-full" onerror="this.parentElement.textContent='${(this.currentUser.username || 'A')[0].toUpperCase()}'">`
        : (this.currentUser.username ? this.currentUser.username[0].toUpperCase() : 'A');

      userBadge.innerHTML = `
        <div class="flex items-center gap-2.5">
          <a href="admin" id="header-admin-btn" class="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#2a170d] hover:bg-[#3d1f11] text-[#fcefc2] hover:text-white border border-[#ee914f] text-xs font-bold shadow-[0_0_15px_rgba(238,145,79,0.35)] transition-all">
            <i class="fa-solid fa-shield-halved text-[#ee914f]"></i>
            <span>Panel Admin</span>
          </a>
          <a href="pro" title="Ir al Tablón de Boosters" class="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#18110b] hover:bg-[#251a11] text-stone-300 hover:text-white border border-stone-800 text-xs font-semibold transition-all">
            <i class="fa-solid fa-bolt text-[#ee914f] text-[11px]"></i>
            <span>Portal Pro</span>
          </a>
          <div class="flex items-center gap-2 bg-[#17120e] px-3.5 py-1.5 rounded-full border border-stone-800">
            <div class="w-6 h-6 rounded-full bg-[#351c0f] border border-[#ee914f] flex items-center justify-center text-xs font-bold text-[#fcefc2] overflow-hidden shrink-0">
              ${avatarHtml}
            </div>
            <div class="hidden sm:block">
              <div class="text-xs font-bold text-white leading-none">${this.currentUser.username}</div>
              <span class="text-[9px] text-[#ee914f] leading-none">${this.currentUser.role || 'Master Booster & Admin'}</span>
            </div>
            <button onclick="app.logout()" title="Cerrar Sesión" class="text-stone-400 hover:text-red-400 text-xs p-1.5 rounded-lg hover:bg-stone-900 transition-all cursor-pointer ml-1">
              <i class="fa-solid fa-right-from-bracket"></i>
            </button>
          </div>
        </div>
      `;
      return;
    } else if (this.currentUser.type === 'booster') {
      const avatarSrc = this.currentUser.avatar || localStorage.getItem('mp_discord_avatar_backup') || '';
      const avatarHtml = avatarSrc 
        ? `<img src="${avatarSrc}" alt="Avatar" class="w-full h-full object-cover rounded-full" onerror="this.parentElement.textContent='${(this.currentUser.username || 'B')[0].toUpperCase()}'">`
        : (this.currentUser.username ? this.currentUser.username[0].toUpperCase() : 'B');
      userBadge.innerHTML = `
        <div class="flex items-center gap-2 bg-[#17120e] px-3 py-1.5 rounded-full border border-stone-800">
          <a href="pro" class="flex items-center gap-2 text-left hover:opacity-90 transition-opacity">
            <div class="w-6 h-6 rounded-full bg-[#2a1e16] border border-[#ee914f]/40 flex items-center justify-center text-xs font-bold text-[#fcefc2] overflow-hidden shrink-0">
              ${avatarHtml}
            </div>
            <div class="hidden sm:block">
              <div class="text-xs font-bold text-white leading-none">${this.currentUser.username}</div>
              <span class="text-[9px] text-[#ee914f] leading-none">Portal Pro (/pro)</span>
            </div>
          </a>
          <button onclick="app.logout()" title="Cerrar Sesión" class="text-stone-400 hover:text-red-400 text-xs p-1.5 rounded-lg hover:bg-stone-900 transition-all cursor-pointer ml-1">
            <i class="fa-solid fa-right-from-bracket"></i>
          </button>
        </div>
      `;
    } else {
      const avatarSrc = this.currentUser.avatar || localStorage.getItem('mp_discord_avatar_backup') || '';
      const avatarHtml = avatarSrc
        ? `<img src="${avatarSrc}" alt="Avatar" class="w-full h-full object-cover rounded-full" onerror="this.parentElement.textContent='${(this.currentUser.username || 'C')[0].toUpperCase()}'">`
        : (this.currentUser.username ? this.currentUser.username[0].toUpperCase() : 'C');
      userBadge.innerHTML = `
        <div class="flex items-center gap-2 bg-[#17120e] px-3 py-1.5 rounded-full border border-stone-800">
          <a href="client-profile" class="flex items-center gap-2 text-left hover:opacity-80 transition-opacity">
            <div class="w-6 h-6 rounded-full bg-[#241a13] border border-[#ee914f]/30 flex items-center justify-center text-xs font-bold text-[#fcefc2] overflow-hidden shrink-0">
              ${avatarHtml}
            </div>
            <div class="hidden sm:block">
              <div class="text-xs font-bold text-white leading-none">${this.currentUser.username}</div>
              <span class="text-[9px] text-[#eedaa2] leading-none">Mi Perfil / Pedidos</span>
            </div>
          </a>
          <button onclick="app.logout()" title="Cerrar Sesión" class="text-stone-400 hover:text-red-400 text-xs p-1.5 rounded-lg hover:bg-stone-900 transition-all cursor-pointer ml-1">
            <i class="fa-solid fa-right-from-bracket"></i>
          </button>
        </div>
      `;
    }
  }

  logout() {
    localStorage.removeItem('mp_current_user');
    sessionStorage.removeItem('mp_current_user');
    sessionStorage.removeItem('mp_discord_oauth_active');
    this.currentUser = null;
    this.renderHeader();
    this.showToast('Sesión cerrada correctamente.', 'info');

    const path = window.location.pathname.toLowerCase();
    if (path.includes('client-profile') || path.includes('pro') || path.includes('admin')) {
      setTimeout(() => {
        window.location.href = '/';
      }, 400);
    }
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    const colors = {
      success: 'bg-[#192418] border-emerald-500 text-emerald-200',
      error: 'bg-[#281412] border-red-500 text-red-200',
      warning: 'bg-[#2b1f13] border-[#ee914f] text-[#fcefc2]',
      info: 'bg-[#1d1611] border-[#ee914f]/50 text-[#eedaa2]'
    };
    toast.className = `fixed top-5 right-5 z-50 p-4 rounded-xl border ${colors[type] || colors.info} shadow-2xl backdrop-blur-md text-xs font-semibold flex items-center gap-2.5 transition-all duration-300 translate-y-[-20px] opacity-0`;
    toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-info'} text-[#ee914f]"></i><span>${message}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.remove('translate-y-[-20px]', 'opacity-0');
    }, 10);

    setTimeout(() => {
      toast.classList.add('opacity-0');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // Common helpers
  calculateEconomics(totalPrice, isUpsell = false) {
    const safePrice = Math.max(0, Number(totalPrice) || 0);
    const boosterRate = isUpsell ? (typeof BOOSTER_UPSELL_PERCENT !== 'undefined' ? BOOSTER_UPSELL_PERCENT : 50) : (typeof BOOSTER_DEFAULT_PERCENT !== 'undefined' ? BOOSTER_DEFAULT_PERCENT : 30);
    const companyRate = 100 - boosterRate;

    const company = Number((safePrice * (companyRate / 100)).toFixed(2));
    const booster = Number((safePrice * (boosterRate / 100)).toFixed(2));
    const maxBid = Number((safePrice * (typeof BOOSTER_MAX_BID_PERCENT !== 'undefined' ? (BOOSTER_MAX_BID_PERCENT / 100) : 0.50)).toFixed(2));
    return { company, booster, maxBid, boosterRate };
  }

  // ==========================================
  // WOW REALMS SELECTOR & FAST FILTER SUITE
  // ==========================================
  initRealmSelector() {
    const realmSearchInput = document.getElementById('sp-realm-search');
    const charNameInput = document.getElementById('sp-char-name');
    const regionSelect = document.getElementById('sp-region');
    if (!realmSearchInput || !charNameInput) return;

    // Default realm is Ragnaros (US - Retail)
    if (!this.selectedRealm) {
      this.selectedRealm = (this.realms && this.realms.length > 0)
        ? (this.realms.find(r => r.name === 'Ragnaros' && r.region === 'US') || this.realms[0])
        : { name: 'Ragnaros', region: 'US', version: 'Retail', category: 'América Latina', type: 'Normal' };
    }

    // Default character name from current session or fallback
    if (!charNameInput.value) {
      const defaultName = (this.currentUser?.username && this.currentUser.username !== 'Aventurero')
        ? this.currentUser.username
        : 'Heroe';
      charNameInput.value = defaultName;
    }

    realmSearchInput.value = this.selectedRealm.name;
    if (regionSelect) regionSelect.value = this.selectedRealm.region;

    this.updateCombinedCharacter();
    this.renderRealmDropdownItems('');

    // Click outside listener to close realm dropdown
    document.addEventListener('click', (e) => {
      const container = document.getElementById('sp-realm-dropdown-container');
      if (container && !container.contains(e.target)) {
        this.closeRealmDropdown();
      }
    });
  }

  setRealmVersionFilter(version) {
    this.currentRealmVersionFilter = version;
    
    // Update pills styling
    const pills = document.querySelectorAll('#sp-realm-version-pills .realm-pill-btn');
    pills.forEach(btn => {
      if ((version === 'ALL' && btn.textContent.trim() === 'Todos') || btn.textContent.trim() === version) {
        btn.classList.add('active', 'bg-[#ee914f]/25', 'text-[#fcefc2]', 'border-[#ee914f]/50', 'font-bold');
        btn.classList.remove('text-stone-400');
      } else {
        btn.classList.remove('active', 'bg-[#ee914f]/25', 'text-[#fcefc2]', 'border-[#ee914f]/50', 'font-bold');
        btn.classList.add('text-stone-400');
      }
    });

    const searchVal = document.getElementById('sp-realm-search')?.value.trim() || '';
    this.renderRealmDropdownItems(searchVal);
    this.openRealmDropdown();
  }

  onRegionChange() {
    const region = document.getElementById('sp-region')?.value || 'US';
    // If current selected realm does not match the new region, select the primary realm of that region
    if (this.selectedRealm && this.selectedRealm.region !== region) {
      const newDefault = (this.realms || []).find(r => r.region === region && (r.name === 'Silvermoon' || r.name === 'Ragnaros')) 
                      || (this.realms || []).find(r => r.region === region);
      if (newDefault) {
        this.selectedRealm = newDefault;
        const searchInput = document.getElementById('sp-realm-search');
        if (searchInput) searchInput.value = newDefault.name;
        this.updateCombinedCharacter();
      }
    }
    const searchVal = document.getElementById('sp-realm-search')?.value.trim() || '';
    this.renderRealmDropdownItems(searchVal);
  }

  openRealmDropdown() {
    const menu = document.getElementById('sp-realm-dropdown-menu');
    const chevron = document.getElementById('sp-realm-chevron');
    if (!menu) return;
    menu.classList.remove('hidden');
    if (chevron) chevron.classList.add('rotate-180');
    const searchVal = document.getElementById('sp-realm-search')?.value.trim() || '';
    this.renderRealmDropdownItems(searchVal);
  }

  closeRealmDropdown() {
    const menu = document.getElementById('sp-realm-dropdown-menu');
    const chevron = document.getElementById('sp-realm-chevron');
    if (!menu) return;
    menu.classList.add('hidden');
    if (chevron) chevron.classList.remove('rotate-180');
  }

  toggleRealmDropdown() {
    const menu = document.getElementById('sp-realm-dropdown-menu');
    if (menu && menu.classList.contains('hidden')) {
      this.openRealmDropdown();
    } else {
      this.closeRealmDropdown();
    }
  }

  filterRealmDropdown(query) {
    this.openRealmDropdown();
    this.renderRealmDropdownItems(query);
  }

  renderRealmDropdownItems(query = '') {
    const listContainer = document.getElementById('sp-realm-list-items');
    const countEl = document.getElementById('sp-realm-count');
    if (!listContainer) return;

    const q = query.trim().toLowerCase();
    const currentRegion = document.getElementById('sp-region')?.value || 'US';
    const versionFilter = this.currentRealmVersionFilter || 'ALL';

    let filtered = (this.realms || []).filter(r => {
      // Version filter
      if (versionFilter !== 'ALL' && r.version !== versionFilter) return false;
      // Region match - if query is empty, prioritize current region, but allow searching across regions if query has text
      if (!q && r.region !== currentRegion) return false;
      // Search text filter
      if (q) {
        const matchName = r.name.toLowerCase().includes(q);
        const matchCat = (r.category || '').toLowerCase().includes(q);
        const matchType = (r.type || '').toLowerCase().includes(q);
        const matchVer = (r.version || '').toLowerCase().includes(q);
        const matchRegion = r.region.toLowerCase() === q;
        if (!matchName && !matchCat && !matchType && !matchVer && !matchRegion) return false;
      }
      return true;
    });

    if (countEl) {
      countEl.textContent = `${filtered.length} reinos encontrados`;
    }

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div class="p-4 text-center text-stone-500">
          <i class="fa-solid fa-triangle-exclamation text-amber-500/60 text-lg mb-1 block"></i>
          <span>No se encontraron reinos con "${query}".</span>
          <p class="text-[10px] text-stone-600 mt-0.5">Puedes escribir el nombre directamente si es un reino especial.</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = filtered.map(r => {
      const isSelected = this.selectedRealm && this.selectedRealm.name === r.name && this.selectedRealm.region === r.region;
      let badgeVerColor = 'bg-blue-950/80 text-blue-300 border-blue-600/40';
      if (r.version === 'Classic') badgeVerColor = 'bg-amber-950/80 text-amber-300 border-amber-600/40';
      if (r.version === 'Forever') badgeVerColor = 'bg-purple-950/80 text-purple-300 border-purple-600/40';

      const safeName = r.name.replace(/'/g, "\\'");
      const safeCat = (r.category || '').replace(/'/g, "\\'");

      return `
        <div onclick="app.selectRealm('${safeName}', '${r.region}', '${r.version}', '${safeCat}')" 
             class="p-2.5 flex items-center justify-between hover:bg-[#20140c] cursor-pointer transition-colors ${isSelected ? 'bg-[#291a10] border-l-2 border-[#ee914f]' : ''}">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-server text-[10px] ${r.version === 'Forever' ? 'text-purple-400' : (r.version === 'Classic' ? 'text-amber-400' : 'text-[#ee914f]')}"></i>
            <div>
              <span class="font-bold text-stone-200 block leading-tight text-xs">${r.name}</span>
              <span class="text-[9px] text-stone-500">${r.category || 'Reino'} • ${r.type || 'Normal'}</span>
            </div>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            <span class="px-1.5 py-0.5 rounded text-[9px] font-mono-gaming font-bold bg-stone-900 text-stone-300 border border-stone-800">${r.region}</span>
            <span class="px-1.5 py-0.5 rounded text-[9px] font-bold border ${badgeVerColor}">${r.version}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  selectRealm(name, region, version, category) {
    this.selectedRealm = { name, region, version, category };
    const searchInput = document.getElementById('sp-realm-search');
    const regionSelect = document.getElementById('sp-region');
    const tag = document.getElementById('sp-selected-realm-tag');

    if (searchInput) searchInput.value = name;
    if (regionSelect && region) regionSelect.value = region;
    if (tag) {
      tag.textContent = `${version} • ${region}`;
      tag.classList.remove('hidden');
    }

    this.closeRealmDropdown();
    this.updateCombinedCharacter();
  }

  selectQuickRealm(name, region, version) {
    const realm = (this.realms || []).find(r => r.name === name && r.region === region) || {
      name, region, version, category: ''
    };
    this.selectRealm(realm.name, realm.region, realm.version, realm.category);
  }

  updateCombinedCharacter() {
    const charName = document.getElementById('sp-char-name')?.value.trim() || 'Heroe';
    const realmName = this.selectedRealm?.name || document.getElementById('sp-realm-search')?.value.trim() || 'Ragnaros';
    const region = document.getElementById('sp-region')?.value || this.selectedRealm?.region || 'US';
    const hiddenCharInput = document.getElementById('sp-character');
    const summaryText = document.getElementById('sp-char-summary-text');
    const summaryExtra = document.getElementById('sp-char-summary-extra');

    const combined = `${charName}-${realmName}`;
    if (hiddenCharInput) hiddenCharInput.value = combined;
    if (summaryText) summaryText.textContent = combined;
    if (summaryExtra) {
      const ver = this.selectedRealm?.version || 'Retail';
      const cat = this.selectedRealm?.category || '';
      summaryExtra.textContent = `${region === 'US' ? 'América (US)' : 'Europa (EU)'} • ${ver}${cat ? ' • ' + cat : ''}`;
    }
  }

  getFallbackRealmsList() {
    return [
      {"name": "Ragnaros", "region": "US", "version": "Retail", "category": "América Latina", "type": "Normal"},
      {"name": "Quel'Thalas", "region": "US", "version": "Retail", "category": "América Latina", "type": "Normal"},
      {"name": "Drakkari", "region": "US", "version": "Retail", "category": "América Latina", "type": "Normal"},
      {"name": "Azralon", "region": "US", "version": "Retail", "category": "Brasil", "type": "Normal"},
      {"name": "Area 52", "region": "US", "version": "Retail", "category": "Estados Unidos", "type": "Normal"},
      {"name": "Illidan", "region": "US", "version": "Retail", "category": "Estados Unidos", "type": "Normal"},
      {"name": "Stormrage", "region": "US", "version": "Retail", "category": "Estados Unidos", "type": "Normal"},
      {"name": "Sargeras", "region": "US", "version": "Retail", "category": "Estados Unidos", "type": "Normal"},
      {"name": "Tichondrius", "region": "US", "version": "Retail", "category": "Estados Unidos", "type": "Normal"},
      {"name": "Proudmoore", "region": "US", "version": "Retail", "category": "Estados Unidos", "type": "Normal"},
      {"name": "Zul'jin", "region": "US", "version": "Retail", "category": "Estados Unidos", "type": "Normal"},
      {"name": "Bleeding Hollow", "region": "US", "version": "Retail", "category": "Estados Unidos", "type": "Normal"},
      {"name": "Mal'Ganis", "region": "US", "version": "Retail", "category": "Estados Unidos", "type": "Normal"},
      {"name": "Thrall", "region": "US", "version": "Retail", "category": "Estados Unidos", "type": "Normal"},
      {"name": "Dalaran", "region": "US", "version": "Retail", "category": "Estados Unidos", "type": "Normal"},
      {"name": "Frostmourne", "region": "US", "version": "Retail", "category": "Oceanía", "type": "Normal"},
      {"name": "Dun Modr", "region": "EU", "version": "Retail", "category": "España", "type": "Normal"},
      {"name": "Sanguino", "region": "EU", "version": "Retail", "category": "España", "type": "Normal"},
      {"name": "Zul'jin (EU)", "region": "EU", "version": "Retail", "category": "España", "type": "Normal"},
      {"name": "Silvermoon", "region": "EU", "version": "Retail", "category": "Inglés (EU)", "type": "Normal"},
      {"name": "Draenor", "region": "EU", "version": "Retail", "category": "Inglés (EU)", "type": "Normal"},
      {"name": "Tarren Mill", "region": "EU", "version": "Retail", "category": "Inglés (EU)", "type": "Normal"},
      {"name": "Kazzak", "region": "EU", "version": "Retail", "category": "Inglés (EU)", "type": "Normal"},
      {"name": "Twisting Nether", "region": "EU", "version": "Retail", "category": "Inglés (EU)", "type": "Normal"},
      {"name": "Ravencrest", "region": "EU", "version": "Retail", "category": "Inglés (EU)", "type": "Normal"},
      {"name": "Antonidas", "region": "EU", "version": "Retail", "category": "Alemán", "type": "Normal"},
      {"name": "Hyjal (EU)", "region": "EU", "version": "Retail", "category": "Francés", "type": "Normal"},
      {"name": "Whitemane", "region": "US", "version": "Classic", "category": "Classic Era (US)", "type": "PvP"},
      {"name": "Mankrik", "region": "US", "version": "Classic", "category": "Classic Era (US)", "type": "PvE"},
      {"name": "Grobbulus", "region": "US", "version": "Classic", "category": "Classic Era (US)", "type": "RP-PvP"},
      {"name": "Faerlina", "region": "US", "version": "Classic", "category": "Classic Era (US)", "type": "PvP"},
      {"name": "Firemaw", "region": "EU", "version": "Classic", "category": "Classic Era (EU)", "type": "PvP"},
      {"name": "Pyrewood Village", "region": "EU", "version": "Classic", "category": "Classic Era (EU)", "type": "PvE"},
      {"name": "Gehennas", "region": "EU", "version": "Classic", "category": "Classic Era (EU)", "type": "PvP"},
      {"name": "Mandokir", "region": "EU", "version": "Classic", "category": "Classic Era (España)", "type": "PvP"},
      {"name": "Crusader Strike (US)", "region": "US", "version": "Classic", "category": "Season of Discovery", "type": "RP-PvP"},
      {"name": "Wild Growth (US)", "region": "US", "version": "Classic", "category": "Season of Discovery", "type": "PvE"},
      {"name": "Defias Pillager", "region": "US", "version": "Classic", "category": "Hardcore Classic", "type": "Hardcore"},
      {"name": "Skull Rock", "region": "US", "version": "Classic", "category": "Hardcore Classic", "type": "Hardcore"},
      {"name": "Stitches", "region": "EU", "version": "Classic", "category": "Hardcore Classic", "type": "Hardcore"},
      {"name": "Forever Americas - Normal (PvE)", "region": "US", "version": "Forever", "category": "WoW Forever (Megaservidores)", "type": "PvE"},
      {"name": "Forever Americas - JcJ (PvP)", "region": "US", "version": "Forever", "category": "WoW Forever (Megaservidores)", "type": "PvP"},
      {"name": "Forever Americas - Hardcore", "region": "US", "version": "Forever", "category": "WoW Forever (Megaservidores)", "type": "Hardcore"},
      {"name": "Forever Americas - Fresh Anniversary (PvE)", "region": "US", "version": "Forever", "category": "WoW Forever (Anniversary)", "type": "PvE"},
      {"name": "Forever Europe - Normal (PvE)", "region": "EU", "version": "Forever", "category": "WoW Forever (Megaservidores)", "type": "PvE"},
      {"name": "Forever Europe - JcJ (PvP)", "region": "EU", "version": "Forever", "category": "WoW Forever (Megaservidores)", "type": "PvP"},
      {"name": "Forever Europe - Hardcore", "region": "EU", "version": "Forever", "category": "WoW Forever (Anniversary)", "type": "Hardcore"}
    ];
  }

  // ==========================================
  // LIVE CHAT WIDGET SUITE (SOPORTE EN VIVO 24/7)
  // ==========================================
  initLiveChatWidget() {
    // 1. Check for 3rd-party provider overrides if configured
    const crispId = localStorage.getItem('mp_live_chat_crisp_id');
    const tawkId = localStorage.getItem('mp_live_chat_tawk_id');

    if (crispId) {
      window.$crisp = [];
      window.CRISP_WEBSITE_ID = crispId;
      const s = document.createElement('script');
      s.src = 'https://client.crisp.chat/l.js';
      s.async = true;
      document.head.appendChild(s);
      return;
    }

    if (tawkId) {
      const s = document.createElement('script');
      s.src = `https://embed.tawk.to/${tawkId}`;
      s.async = true;
      s.charset = 'UTF-8';
      s.setAttribute('crossorigin', '*');
      document.head.appendChild(s);
      return;
    }

    // 2. Default: Native Obsidian & Copper Live Chat Widget
    this.injectNativeLiveChat();
    this.initLiveChatSync();
  }

  initLiveChatSync() {
    try {
      if (typeof window === 'undefined') return;

      // 1. BroadcastChannel for 0ms cross-tab synchronization
      if (window.BroadcastChannel) {
        try {
          this.liveChatChannel = new BroadcastChannel('mp_live_support_channel');
          this.liveChatChannel.onmessage = (evt) => {
            if (!evt || !evt.data) return;
            if (evt.data.type === 'NEW_LIVE_CHAT_MSG') {
              try {
                const stored = localStorage.getItem('mp_live_support_chat');
                if (stored) this.liveChatMessages = JSON.parse(stored);
              } catch (e) {}
              const list = document.getElementById('mp-live-chat-messages');
              if (list) this.renderLiveChatMessages();
              const adminList = document.getElementById('chat-conversations-list');
              if (adminList) this.renderChatList();
              if (this.activeChatOrderId === 'live_support' && typeof this.openAdminLiveSupportChat === 'function') {
                this.openAdminLiveSupportChat();
              }
            } else if (
              evt.data.type === 'ORDER_CLAIMED' || 
              evt.data.type === 'ORDER_UNASSIGNED' || 
              evt.data.type === 'ORDER_UPDATED' || 
              evt.data.type === 'ORDER_CHAT_MESSAGE' || 
              evt.data.type === 'ORDER_REPORTED' || 
              evt.data.type === 'ORDER_COMPLETED' || 
              evt.data.type === 'ORDER_REJECTED'
            ) {
              try {
                const stored = localStorage.getItem('mp_orders');
                if (stored) this.orders = JSON.parse(stored);
              } catch (e) {}
              this.renderProOrderFeed();
              this.renderProMyOrders();
              this.renderAdminOverview();
              this.renderAdminOrders(this.currentAdminOrderStatusFilter || 'ALL');
              this.renderChatList();
              if (typeof this.renderClientOrders === 'function') this.renderClientOrders();
              if (this.activeChatOrderId && this.activeChatOrderId !== 'live_support') {
                this.openChat(this.activeChatOrderId);
              }
            }
          };
        } catch (e) {
          console.warn('BroadcastChannel init error:', e);
        }
      }

      // 2. Storage event listener for multi-window sync fallback
      window.addEventListener('storage', (e) => {
        if (e.key === 'mp_live_support_chat') {
          try {
            this.liveChatMessages = JSON.parse(e.newValue || '[]');
          } catch (err) {}
          this.renderLiveChatMessages();
          if (typeof this.renderChatList === 'function') this.renderChatList();
          if (this.activeChatOrderId === 'live_support' && typeof this.openAdminLiveSupportChat === 'function') {
            this.openAdminLiveSupportChat();
          }
        } else if (e.key === 'mp_orders') {
          try {
            this.orders = JSON.parse(e.newValue || '[]');
          } catch (err) {}
          this.renderProOrderFeed();
          this.renderProMyOrders();
          this.renderAdminOverview();
          this.renderAdminOrders(this.currentAdminOrderStatusFilter || 'ALL');
          this.renderChatList();
          if (typeof this.renderClientOrders === 'function') this.renderClientOrders();
          if (this.activeChatOrderId && this.activeChatOrderId !== 'live_support') {
            this.openChat(this.activeChatOrderId);
          }
        }
      });
    } catch (e) {
      console.warn('initLiveChatSync notice:', e);
    }
  }

  injectNativeLiveChat() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('mp-live-chat-launcher')) return;

    // Launcher visible across all portals for seamless live support communication

    const defaultMessages = [
      {
        id: 'msg_welcome',
        sender: 'support',
        author: 'Soporte Mythic (Alex)',
        avatar: 'assets/img/logo_circular.png',
        message: '¡Hola! 👋 Bienvenido a Mythic Progression. Estamos disponibles 24/7 para responder tus preguntas sobre míticas+, raids, nivelación o disponibilidad de boosters antes de ordenar.',
        time: 'En línea'
      }
    ];

    let stored = [];
    try {
      stored = JSON.parse(localStorage.getItem('mp_live_support_chat')) || [];
    } catch (e) {
      stored = [];
    }
    if (!stored || stored.length === 0) {
      stored = defaultMessages;
      localStorage.setItem('mp_live_support_chat', JSON.stringify(stored));
    }
    this.liveChatMessages = stored;

    // Create container
    const container = document.createElement('div');
    container.id = 'mp-live-chat-root';
    container.className = 'notranslate';
    container.setAttribute('translate', 'no');
    container.innerHTML = `
      <!-- FLOATING LAUNCHER -->
      <div id="mp-live-chat-launcher" class="flex fixed bottom-6 right-6 z-[999] items-center gap-3 notranslate" translate="no">
        <!-- Callout bubble tooltip (hidden on mobile) -->
        <div id="mp-chat-bubble-hint" onclick="app.toggleLiveChat()" class="hidden md:flex items-center gap-2 bg-[#18110b]/95 border border-[#ee914f]/60 text-[#fcefc2] px-3.5 py-2 rounded-2xl shadow-2xl text-xs font-semibold cursor-pointer hover:border-[#ee914f] transition-all notranslate" translate="no">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span id="mp-chat-bubble-hint-text" class="notranslate" translate="no">¿Dudas antes de comprar? Chatea en vivo</span>
        </div>
        <!-- Launcher button -->
        <button type="button" onclick="app.toggleLiveChat()" aria-label="Abrir chat en vivo" class="relative w-14 h-14 rounded-full copper-gradient-bg text-white flex items-center justify-center shadow-[0_10px_35px_rgba(238,145,79,0.45)] hover:scale-105 active:scale-95 transition-all cursor-pointer border border-[#fcefc2]/30 notranslate" translate="no">
          <i id="mp-chat-launcher-icon" class="fa-solid fa-comments text-xl"></i>
          <span id="mp-chat-unread-dot" class="hidden absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#120b07]"></span>
        </button>
      </div>

      <!-- LIVE CHAT WINDOW -->
      <div id="mp-live-chat-window" class="hidden fixed bottom-24 right-4 sm:right-6 z-[1000] w-[380px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-7.5rem)] bg-[#120a06]/98 backdrop-blur-2xl border border-stone-700/90 rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden transition-all duration-300 notranslate" translate="no">
        <!-- Header -->
        <div class="p-4 bg-gradient-to-r from-[#1c120c] via-[#24170f] to-[#1a100a] border-b border-stone-800 flex items-center justify-between shrink-0">
          <div class="flex items-center gap-3">
            <div class="relative">
              <img src="assets/img/logo_circular.png" alt="Logo" class="w-10 h-10 rounded-full border border-[#ee914f]/50 object-contain bg-black/50">
              <span class="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#120b07]"></span>
            </div>
            <div>
              <div class="flex items-center gap-1.5">
                <h3 id="mp-live-chat-title" class="text-xs font-bold text-[#fcefc2] uppercase tracking-wider font-cinzel">Soporte en Vivo</h3>
                <span class="text-[9px] bg-[#ee914f]/20 text-[#fcefc2] px-1.5 py-0.5 rounded border border-[#ee914f]/40 font-mono">24/7</span>
              </div>
              <p class="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span id="mp-live-chat-status-text">Conectado • Respuesta inmediata</span>
              </p>
            </div>
          </div>
          <div class="flex items-center gap-1 text-stone-400">
            <button type="button" onclick="app.toggleLiveChat()" class="w-8 h-8 rounded-lg hover:bg-stone-800/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer" title="Cerrar chat">
              <i class="fa-solid fa-xmark text-sm"></i>
            </button>
          </div>
        </div>

        <!-- Chat Stream -->
        <div id="mp-live-chat-messages" class="flex-1 overflow-y-auto p-4 space-y-3 text-xs text-stone-200">
          <!-- Rendered messages -->
        </div>

        <!-- Quick Prompts / FAQ Chips -->
        <div id="mp-live-chat-quick-chips" class="px-3.5 py-2 border-t border-stone-800/70 bg-[#160e09]/80 overflow-x-auto flex items-center gap-1.5 shrink-0">
          <button type="button" onclick="app.sendLiveChatQuick('¿Tienen cupos disponibles hoy?')" class="whitespace-nowrap text-[10px] bg-[#22150e] hover:bg-[#2f1d13] text-[#fcefc2] border border-[#ee914f]/30 px-2.5 py-1 rounded-full transition-colors cursor-pointer">⚡ ¿Hay cupos hoy?</button>
          <button type="button" onclick="app.sendLiveChatQuick('¿Es seguro con VPN de mi país?')" class="whitespace-nowrap text-[10px] bg-[#22150e] hover:bg-[#2f1d13] text-[#fcefc2] border border-[#ee914f]/30 px-2.5 py-1 rounded-full transition-colors cursor-pointer">🛡️ ¿Es seguro?</button>
          <button type="button" onclick="app.sendLiveChatQuick('¿Cuánto tardan en comenzar?')" class="whitespace-nowrap text-[10px] bg-[#22150e] hover:bg-[#2f1d13] text-[#fcefc2] border border-[#ee914f]/30 px-2.5 py-1 rounded-full transition-colors cursor-pointer">⏳ ¿Cuánto tardan?</button>
        </div>

        <!-- Input Box -->
        <div class="p-3 bg-[#150d08] border-t border-stone-800 flex items-center gap-2 shrink-0">
          <input id="mp-live-chat-input" type="text" placeholder="Escribe tu consulta aquí..." onkeydown="if(event.key==='Enter') app.sendLiveChatMessage()" class="flex-1 bg-[#1c120b] border border-stone-700/80 focus:border-[#ee914f] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-stone-500 outline-none transition-colors">
          <button type="button" onclick="app.sendLiveChatMessage()" aria-label="Enviar mensaje" class="w-10 h-10 rounded-xl copper-gradient-bg text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md shrink-0 cursor-pointer">
            <i class="fa-solid fa-paper-plane text-xs"></i>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(container);
    this.updateLiveChatTranslations(this.currentLang);
    this.renderLiveChatMessages();
  }

  updateLiveChatTranslations(lang = this.currentLang) {
    const isEn = lang === 'en';
    const isPt = lang === 'pt';

    const hintEl = document.getElementById('mp-chat-bubble-hint-text');
    if (hintEl) {
      hintEl.textContent = '¿Dudas antes de comprar? Chatea en vivo';
    }

    const titleEl = document.getElementById('mp-live-chat-title');
    if (titleEl) {
      titleEl.textContent = isEn ? 'Live Support' : (isPt ? 'Suporte ao Vivo' : 'Soporte en Vivo');
    }

    const statusEl = document.getElementById('mp-live-chat-status-text');
    if (statusEl) {
      statusEl.textContent = isEn ? 'Connected • Instant reply' : (isPt ? 'Conectado • Resposta imediata' : 'Conectado • Respuesta inmediata');
    }

    const inputEl = document.getElementById('mp-live-chat-input');
    if (inputEl) {
      inputEl.placeholder = isEn ? 'Type your message here...' : (isPt ? 'Digite sua mensagem aqui...' : 'Escribe tu consulta aquí...');
    }

    const chipsEl = document.getElementById('mp-live-chat-quick-chips');
    if (chipsEl) {
      if (isEn) {
        chipsEl.innerHTML = `
          <button type="button" onclick="app.sendLiveChatQuick('Are slots available today?')" class="whitespace-nowrap text-[10px] bg-[#22150e] hover:bg-[#2f1d13] text-[#fcefc2] border border-[#ee914f]/30 px-2.5 py-1 rounded-full transition-colors cursor-pointer">⚡ Slots available today?</button>
          <button type="button" onclick="app.sendLiveChatQuick('Is it safe with VPN for my country?')" class="whitespace-nowrap text-[10px] bg-[#22150e] hover:bg-[#2f1d13] text-[#fcefc2] border border-[#ee914f]/30 px-2.5 py-1 rounded-full transition-colors cursor-pointer">🛡️ Is it safe?</button>
          <button type="button" onclick="app.sendLiveChatQuick('How fast do you start?')" class="whitespace-nowrap text-[10px] bg-[#22150e] hover:bg-[#2f1d13] text-[#fcefc2] border border-[#ee914f]/30 px-2.5 py-1 rounded-full transition-colors cursor-pointer">⏳ How fast do you start?</button>
        `;
      } else if (isPt) {
        chipsEl.innerHTML = `
          <button type="button" onclick="app.sendLiveChatQuick('Tem vagas disponíveis hoje?')" class="whitespace-nowrap text-[10px] bg-[#22150e] hover:bg-[#2f1d13] text-[#fcefc2] border border-[#ee914f]/30 px-2.5 py-1 rounded-full transition-colors cursor-pointer">⚡ Tem vagas hoje?</button>
          <button type="button" onclick="app.sendLiveChatQuick('É seguro com VPN do meu país?')" class="whitespace-nowrap text-[10px] bg-[#22150e] hover:bg-[#2f1d13] text-[#fcefc2] border border-[#ee914f]/30 px-2.5 py-1 rounded-full transition-colors cursor-pointer">🛡️ É seguro?</button>
          <button type="button" onclick="app.sendLiveChatQuick('Quanto tempo leva para iniciar?')" class="whitespace-nowrap text-[10px] bg-[#22150e] hover:bg-[#2f1d13] text-[#fcefc2] border border-[#ee914f]/30 px-2.5 py-1 rounded-full transition-colors cursor-pointer">⏳ Quanto tempo demora?</button>
        `;
      } else {
        chipsEl.innerHTML = `
          <button type="button" onclick="app.sendLiveChatQuick('¿Tienen cupos disponibles hoy?')" class="whitespace-nowrap text-[10px] bg-[#22150e] hover:bg-[#2f1d13] text-[#fcefc2] border border-[#ee914f]/30 px-2.5 py-1 rounded-full transition-colors cursor-pointer">⚡ ¿Hay cupos hoy?</button>
          <button type="button" onclick="app.sendLiveChatQuick('¿Es seguro con VPN de mi país?')" class="whitespace-nowrap text-[10px] bg-[#22150e] hover:bg-[#2f1d13] text-[#fcefc2] border border-[#ee914f]/30 px-2.5 py-1 rounded-full transition-colors cursor-pointer">🛡️ ¿Es seguro?</button>
          <button type="button" onclick="app.sendLiveChatQuick('¿Cuánto tardan en comenzar?')" class="whitespace-nowrap text-[10px] bg-[#22150e] hover:bg-[#2f1d13] text-[#fcefc2] border border-[#ee914f]/30 px-2.5 py-1 rounded-full transition-colors cursor-pointer">⏳ ¿Cuánto tardan?</button>
        `;
      }
    }
  }

  renderLiveChatMessages() {
    const list = document.getElementById('mp-live-chat-messages');
    if (!list) return;

    list.innerHTML = (this.liveChatMessages || []).map(m => {
      const isSupport = m.sender === 'support';
      if (m.isContext) {
        return `
          <div class="p-2.5 rounded-xl bg-[#22160f] border border-[#ee914f]/40 text-[#fcefc2] text-[11px] space-y-1 my-1">
            <div class="font-bold flex items-center gap-1.5 text-[#ee914f]">
              <i class="fa-solid fa-cart-shopping text-[10px]"></i>
              <span>Consulta de Producto</span>
            </div>
            <div class="text-stone-300 leading-snug">${m.message}</div>
          </div>
        `;
      }
      return `
        <div class="flex flex-col ${isSupport ? 'items-start' : 'items-end'}">
          <div class="flex items-center gap-1.5 mb-0.5 text-[10px] text-stone-500">
            ${isSupport ? `<span class="text-[#ee914f] font-semibold">${m.author || 'Soporte'}</span>` : '<span class="text-stone-400 font-semibold">Tú</span>'}
            <span>•</span>
            <span>${m.time || ''}</span>
          </div>
          <div class="max-w-[85%] px-3.5 py-2 rounded-2xl ${isSupport ? 'bg-[#1e140d] border border-stone-800 text-stone-200' : 'bg-gradient-to-r from-[#ee914f] to-[#b85d1d] text-white font-medium shadow-md shadow-[#ee914f]/15'} text-xs leading-relaxed break-words">
            ${m.message}
          </div>
        </div>
      `;
    }).join('');

    list.scrollTop = list.scrollHeight;
  }

  toggleLiveChat() {
    const win = document.getElementById('mp-live-chat-window');
    const icon = document.getElementById('mp-chat-launcher-icon');
    const dot = document.getElementById('mp-chat-unread-dot');
    const hint = document.getElementById('mp-chat-bubble-hint');
    if (!win) {
      this.injectNativeLiveChat();
      return this.toggleLiveChat();
    }

    const isHidden = win.classList.contains('hidden');
    if (isHidden) {
      win.classList.remove('hidden');
      if (icon) {
        icon.classList.remove('fa-comments');
        icon.classList.add('fa-xmark');
      }
      if (dot) dot.classList.add('hidden');
      if (hint) hint.classList.add('hidden');
      this.renderLiveChatMessages();
      setTimeout(() => {
        const inp = document.getElementById('mp-live-chat-input');
        if (inp) inp.focus();
      }, 100);
    } else {
      win.classList.add('hidden');
      if (icon) {
        icon.classList.remove('fa-xmark');
        icon.classList.add('fa-comments');
      }
    }
  }

  openLiveChat(options = {}) {
    // Crisp delegation
    if (window.$crisp) {
      window.$crisp.push(['do', 'chat:open']);
      return;
    }
    // Tawk.to delegation
    if (window.Tawk_API && typeof window.Tawk_API.maximize === 'function') {
      window.Tawk_API.maximize();
      return;
    }

    // Native Live Chat
    const win = document.getElementById('mp-live-chat-window');
    if (!win) this.injectNativeLiveChat();

    const winEl = document.getElementById('mp-live-chat-window');
    if (winEl && winEl.classList.contains('hidden')) {
      this.toggleLiveChat();
    }

    // If triggered from "Chatear antes de ordenar"
    if (options && options.fromProductButton) {
      const prodTitle = document.getElementById('sp-title')?.textContent?.trim() || document.getElementById('sp-product-title')?.textContent?.trim() || 'Servicio WoW';
      const prodPrice = document.getElementById('sp-final-price')?.textContent?.trim() || '';
      const charName = document.getElementById('sp-char-summary-text')?.textContent?.trim() || '';
      const charMeta = document.getElementById('sp-char-summary-extra')?.textContent?.trim() || '';

      // Check if this context message was already added recently
      const alreadyHasContext = (this.liveChatMessages || []).some(m => m.isContext && m.message.includes(prodTitle));
      if (!alreadyHasContext) {
        this.liveChatMessages.push({
          id: 'ctx_' + Date.now(),
          sender: 'system',
          isContext: true,
          message: `Consultando sobre <strong>${prodTitle}</strong> ${prodPrice ? '• <span class="text-[#ee914f]">' + prodPrice + '</span>' : ''} ${charName ? '<br><span class="text-stone-400 text-[10px]">Personaje: ' + charName + ' (' + charMeta + ')</span>' : ''}`,
          time: 'Ahora'
        });
        localStorage.setItem('mp_live_support_chat', JSON.stringify(this.liveChatMessages));
        if (this.liveChatChannel) {
          try {
            this.liveChatChannel.postMessage({ type: 'NEW_LIVE_CHAT_MSG' });
          } catch (e) {}
        }
        this.renderLiveChatMessages();
      }

      // Pre-fill input with ready question so user can just click send or customize
      const inp = document.getElementById('mp-live-chat-input');
      if (inp) {
        inp.value = `Hola, ¿tienen disponibilidad ahora para ${prodTitle}?`;
        inp.focus();
        inp.select();
      }
    }
  }

  sendLiveChatQuick(text) {
    const inp = document.getElementById('mp-live-chat-input');
    if (inp) inp.value = text;
    this.sendLiveChatMessage();
  }

  sendLiveChatMessage() {
    const inp = document.getElementById('mp-live-chat-input');
    if (!inp) return;
    const text = inp.value.trim();
    if (!text) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = {
      id: 'msg_' + Date.now(),
      sender: 'client',
      author: this.currentUser ? this.currentUser.username : 'Tú',
      message: text,
      time: timeStr
    };

    this.liveChatMessages = this.liveChatMessages || [];
    this.liveChatMessages.push(userMsg);
    localStorage.setItem('mp_live_support_chat', JSON.stringify(this.liveChatMessages));
    this.syncLiveSupportToCloud();
    if (this.liveChatChannel) {
      try {
        this.liveChatChannel.postMessage({ type: 'NEW_LIVE_CHAT_MSG', msg: userMsg });
      } catch (e) {}
    }
    inp.value = '';

    this.renderLiveChatMessages();
    this.playChatChime();

    // Auto-responder simulation with realistic typing delay
    this.showLiveChatTyping(true);

    setTimeout(() => {
      this.showLiveChatTyping(false);
      let replyText = '¡Mensaje recibido! Nuestro Staff y Master Booster están en línea. Si tienes cualquier requerimiento especial (horario específico, no tocar oro, streaming en Discord), puedes indicárnoslo aquí.';
      const lower = text.toLowerCase();

      if (lower.includes('cupo') || lower.includes('disponible') || lower.includes('iniciar') || lower.includes('hoy') || lower.includes('ahora')) {
        replyText = '¡Sí! Tenemos boosters verificados disponibles en este momento. Al confirmar tu pedido, tu booster se asigna en 10-15 minutos y se abre tu chat privado de coordinación.';
      } else if (lower.includes('seguro') || lower.includes('ban') || lower.includes('vpn') || lower.includes('riesgo')) {
        replyText = '100% seguro. Todos nuestros boosters juegan con VPN dedicada configurada en tu misma región y ciudad para máxima discreción y seguridad total de tu cuenta Blizzard.';
      } else if (lower.includes('tarda') || lower.includes('tiempo') || lower.includes('demora') || lower.includes('duracion')) {
        replyText = 'Las míticas+ y raids inician habitualmente entre 15 y 30 minutos tras el pago. Si eliges Powerleveling, podemos adaptarnos al horario en que tú no uses la cuenta.';
      } else if (lower.includes('precio') || lower.includes('barato') || lower.includes('descuento') || lower.includes('igualar')) {
        replyText = '¡Tenemos garantía de mejor precio! Si viste la misma oferta más barata en otra plataforma formal, te igualamos el precio y además acumulas 5% de cashback en tu saldo.';
      } else if (lower.includes('hola') || lower.includes('buenas') || lower.includes('hey')) {
        replyText = '¡Hola! ¿Cómo estás? Dime con qué servicio o mazmorra necesitas ayuda y con gusto te doy detalles y disponibilidad inmediata.';
      }

      const supportMsg = {
        id: 'msg_' + Date.now(),
        sender: 'support',
        author: 'Soporte Mythic (Alex)',
        message: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      this.liveChatMessages.push(supportMsg);
      localStorage.setItem('mp_live_support_chat', JSON.stringify(this.liveChatMessages));
      this.syncLiveSupportToCloud();
      if (this.liveChatChannel) {
        try {
          this.liveChatChannel.postMessage({ type: 'NEW_LIVE_CHAT_MSG', msg: supportMsg });
        } catch (e) {}
      }
      this.renderLiveChatMessages();
      this.playChatChime();
    }, 1200);
  }

  showLiveChatTyping(show) {
    const list = document.getElementById('mp-live-chat-messages');
    if (!list) return;
    const existing = document.getElementById('mp-live-chat-typing');
    if (existing) existing.remove();

    if (show) {
      const typingEl = document.createElement('div');
      typingEl.id = 'mp-live-chat-typing';
      typingEl.className = 'flex items-center gap-1.5 text-[11px] text-[#ee914f] bg-[#1e140d] border border-stone-800 rounded-xl px-3 py-1.5 w-fit';
      typingEl.innerHTML = `
        <span class="w-1.5 h-1.5 rounded-full bg-[#ee914f] animate-bounce"></span>
        <span class="w-1.5 h-1.5 rounded-full bg-[#ee914f] animate-bounce [animation-delay:0.2s]"></span>
        <span class="w-1.5 h-1.5 rounded-full bg-[#ee914f] animate-bounce [animation-delay:0.4s]"></span>
        <span class="text-stone-400 text-[10px] ml-1">Soporte está respondiendo...</span>
      `;
      list.appendChild(typingEl);
      list.scrollTop = list.scrollHeight;
    }
  }

  playChatChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1174, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {
      // Audio policy ignored safely
    }
  }

  // ==========================================
  // MULTI-LANGUAGE SYSTEM (ES, EN, PT-BR)
  // ==========================================
  initLanguage() {
    this.currentLang = localStorage.getItem('mp_lang') || 'es';
    this.renderLanguageSelector();

    if (!this._langListenerAttached && typeof document !== 'undefined') {
      document.addEventListener('click', (e) => {
        const container = document.getElementById('header-lang-selector');
        const dropdown = document.getElementById('header-lang-dropdown');
        if (dropdown && !dropdown.classList.contains('hidden')) {
          if (container && !container.contains(e.target)) {
            dropdown.classList.add('hidden');
            const chev = document.getElementById('header-lang-chevron');
            if (chev) chev.classList.remove('rotate-180');
          }
        }
      });
      this._langListenerAttached = true;
    }

    if (this.currentLang !== 'es') {
      setTimeout(() => this.applyTranslations(), 150);
    }
  }

  renderLanguageSelector() {
    if (typeof document === 'undefined') return;
    let langContainer = document.getElementById('header-lang-selector');
    const userBadge = document.getElementById('user-session-badge');

    // Auto-inject container in header if not directly in HTML
    if (!langContainer && userBadge && userBadge.parentElement) {
      langContainer = document.createElement('div');
      langContainer.id = 'header-lang-selector';
      langContainer.className = 'relative shrink-0 notranslate';
      langContainer.setAttribute('translate', 'no');
      userBadge.parentElement.insertBefore(langContainer, userBadge);
    }

    if (!langContainer) return;

    const current = this.currentLang || 'es';
    const langMeta = {
      es: { code: 'ES', flag: '🇪🇸', label: 'Español' },
      en: { code: 'EN', flag: '🇺🇸', label: 'English' },
      pt: { code: 'PT', flag: '🇧🇷', label: 'Português (BR)' }
    };
    const active = langMeta[current] || langMeta.es;

    langContainer.innerHTML = `
      <div class="relative" id="mp-lang-dropdown-wrapper">
        <button type="button" onclick="app.toggleLangDropdown(event)" id="header-lang-btn" class="h-9 px-2.5 sm:px-3 rounded-xl bg-[#17110d] hover:bg-[#231812] border border-stone-800 hover:border-[#ee914f]/50 text-xs font-bold text-[#fcefc2] flex items-center gap-1.5 transition-all cursor-pointer shadow-sm" title="Cambiar idioma / Change language">
          <span class="text-sm">${active.flag}</span>
          <span class="text-[11px] font-mono-gaming font-bold text-white uppercase">${active.code}</span>
          <i class="fa-solid fa-chevron-down text-[8px] text-stone-400 transition-transform duration-200" id="header-lang-chevron"></i>
        </button>

        <div id="header-lang-dropdown" class="hidden absolute right-0 top-full mt-1.5 bg-[#140c08] border border-stone-700/80 rounded-2xl shadow-2xl p-1.5 z-[100] min-w-[160px] space-y-1">
          <button type="button" onclick="app.setLanguage('es')" class="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-colors ${current === 'es' ? 'bg-[#29180e] text-[#fcefc2] border border-[#ee914f]/40 font-bold' : 'text-stone-300 hover:bg-[#20130b] hover:text-white'} cursor-pointer">
            <div class="flex items-center gap-2">
              <span class="text-sm">🇪🇸</span>
              <span>Español</span>
            </div>
            ${current === 'es' ? '<i class="fa-solid fa-check text-[#ee914f] text-[10px]"></i>' : ''}
          </button>

          <button type="button" onclick="app.setLanguage('en')" class="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-colors ${current === 'en' ? 'bg-[#29180e] text-[#fcefc2] border border-[#ee914f]/40 font-bold' : 'text-stone-300 hover:bg-[#20130b] hover:text-white'} cursor-pointer">
            <div class="flex items-center gap-2">
              <span class="text-sm">🇺🇸</span>
              <span>English</span>
            </div>
            ${current === 'en' ? '<i class="fa-solid fa-check text-[#ee914f] text-[10px]"></i>' : ''}
          </button>

          <button type="button" onclick="app.setLanguage('pt')" class="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-colors ${current === 'pt' ? 'bg-[#29180e] text-[#fcefc2] border border-[#ee914f]/40 font-bold' : 'text-stone-300 hover:bg-[#20130b] hover:text-white'} cursor-pointer">
            <div class="flex items-center gap-2">
              <span class="text-sm">🇧🇷</span>
              <span>Português (BR)</span>
            </div>
            ${current === 'pt' ? '<i class="fa-solid fa-check text-[#ee914f] text-[10px]"></i>' : ''}
          </button>
        </div>
      </div>
    `;
  }

  toggleLangDropdown(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    const dropdown = document.getElementById('header-lang-dropdown');
    const chev = document.getElementById('header-lang-chevron');
    if (!dropdown) return;

    const isHidden = dropdown.classList.contains('hidden');
    if (isHidden) {
      dropdown.classList.remove('hidden');
      if (chev) chev.classList.add('rotate-180');
    } else {
      dropdown.classList.add('hidden');
      if (chev) chev.classList.remove('rotate-180');
    }
  }

  setLanguage(lang) {
    this.currentLang = lang;
    localStorage.setItem('mp_lang', lang);

    const dropdown = document.getElementById('header-lang-dropdown');
    if (dropdown) dropdown.classList.add('hidden');
    const chev = document.getElementById('header-lang-chevron');
    if (chev) chev.classList.remove('rotate-180');

    this.renderHeader();
    this.updateLiveChatTranslations(lang);
    this.applyTranslations();

    // Re-apply on short ticks to catch any dynamic content
    setTimeout(() => this.applyTranslations(), 50);
    setTimeout(() => this.applyTranslations(), 250);

    const msgs = {
      es: 'Idioma cambiado a Español',
      en: 'Language switched to English',
      pt: 'Idioma alterado para Português (Brasil)'
    };
    this.showToast(msgs[lang] || msgs.es, 'success');
  }

  applyTranslations() {
    const lang = this.currentLang || 'es';
    if (typeof document === 'undefined') return;

    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : lang;

    const dict = {
      'cerrar sesión': { en: 'Log Out', pt: 'Sair' },
      'cerrar sesion': { en: 'Log Out', pt: 'Sair' },
      'panel admin': { en: 'Admin Panel', pt: 'Painel Admin' },
      'portal pro': { en: 'Pro Portal', pt: 'Portal Pro' },
      'mi cuenta': { en: 'My Account', pt: 'Minha Conta' },
      'mi perfil': { en: 'My Profile', pt: 'Meu Perfil' },
      'mi perfil / pedidos': { en: 'My Profile / Orders', pt: 'Meu Perfil / Pedidos' },
      'inicio': { en: 'Home', pt: 'Início' },
      'míticas plus': { en: 'Mythic Plus', pt: 'Míticas Plus' },
      'miticas plus': { en: 'Mythic Plus', pt: 'Míticas Plus' },
      'bandas / raids': { en: 'Raids', pt: 'Raides' },
      'raids': { en: 'Raids', pt: 'Raides' },
      'bandas': { en: 'Raids', pt: 'Raides' },
      'powerleveling': { en: 'Powerleveling', pt: 'Powerleveling' },
      'equipo / ilvl': { en: 'Gearing / ilvl', pt: 'Equipamento / ilvl' },
      'catálogo completo': { en: 'Full Catalog', pt: 'Catálogo Completo' },
      'buscar servicios de wow (míticas+, bandas, leveling, equipo)...': { en: 'Search WoW services (Mythic+, Raids, Leveling, Gear)...', pt: 'Buscar serviços WoW (Míticas+, Raides, Leveling, Equipamento)...' },
      'world of warcraft: the war within - temporada oficial': { en: 'World of Warcraft: The War Within - Official Season', pt: 'World of Warcraft: The War Within - Temporada Oficial' },
      'world of warcraft: midnight - temporada oficial': { en: 'World of Warcraft: Midnight - Official Season', pt: 'World of Warcraft: Midnight - Temporada Oficial' },
      'el abismo venenoso & temporada de bandas': { en: 'The Venomous Abyss & Raid Season', pt: 'The Venomous Abyss & Temporada de Raides' },
      'temporada míticas+ midnight': { en: 'Mythic+ Season Midnight', pt: 'Temporada Míticas+ Midnight' },
      'abismo venenoso aotc': { en: 'The Venomous Abyss AOTC', pt: 'The Venomous Abyss AOTC' },
      'domina el contenido mítico': { en: 'DOMINATE MYTHIC CONTENT', pt: 'DOMINE O CONTEÚDO MÍTICO' },
      'con jugadores de élite': { en: 'WITH ELITE PLAYERS', pt: 'COM JOGADORES DE ELITE' },
      'vpn, safe boost': { en: 'VPN, Safe Boost', pt: 'VPN, Safe Boost' },
      'servicio seguro': { en: 'Secure Service', pt: 'Serviço Seguro' },
      '24/7 soporte': { en: '24/7 Support', pt: 'Suporte 24/7' },
      'reembolsos': { en: 'Refunds', pt: 'Reembolsos' },
      'cashback 5%': { en: '5% Cashback', pt: '5% Cashback' },
      'personalización del pedido': { en: 'Order Customization', pt: 'Personalização do Pedido' },
      'personalizacion del pedido': { en: 'Order Customization', pt: 'Personalização do Pedido' },
      'datos de tu personaje (wow):': { en: 'Character Details (WoW):', pt: 'Dados do seu Personagem (WoW):' },
      'región:': { en: 'Region:', pt: 'Região:' },
      'region:': { en: 'Region:', pt: 'Região:' },
      'américa (us)': { en: 'Americas (US)', pt: 'Américas (US)' },
      'europa (eu)': { en: 'Europe (EU)', pt: 'Europa (EU)' },
      'personaje:': { en: 'Character:', pt: 'Personagem:' },
      'nombre del personaje:': { en: 'Character Name:', pt: 'Nome do Personagem:' },
      'reino / servidor:': { en: 'Realm / Server:', pt: 'Reino / Servidor:' },
      'todos': { en: 'All', pt: 'Todos' },
      'populares:': { en: 'Popular:', pt: 'Populares:' },
      'personaje para la orden:': { en: 'Character for order:', pt: 'Personagem para o pedido:' },
      'total': { en: 'TOTAL', pt: 'TOTAL' },
      'total:': { en: 'Total:', pt: 'Total:' },
      'añadir al carrito': { en: 'ADD TO CART', pt: 'ADICIONAR AO CARRINHO' },
      'anadir al carrito': { en: 'ADD TO CART', pt: 'ADICIONAR AO CARRINHO' },
      'comprar ahora': { en: 'BUY NOW', pt: 'COMPRAR AGORA' },
      '¿tienes preguntas?': { en: 'Have questions?', pt: 'Tem dúvidas?' },
      'chatear antes de ordenar': { en: 'Chat before ordering', pt: 'Conversar antes de pedir' },
      '¿lo viste más barato? igualamos el precio': { en: 'Found it cheaper? We price match', pt: 'Viu mais barato? Cobrimos o preço' },
      'otros servicios recomendados': { en: 'Other Recommended Services', pt: 'Outros Serviços Recomendados' },
      'de cashback tras la compra': { en: 'cashback after purchase', pt: 'de cashback após a compra' },
      'modo de juego:': { en: 'Game Mode:', pt: 'Modo de Jogo:' },
      'piloteado': { en: 'Piloted', pt: 'Pilotado' },
      'selfplay': { en: 'Selfplay', pt: 'Selfplay' },
      'selfplay (juegas tú)': { en: 'Selfplay (you play)', pt: 'Selfplay (você joga)' },
      'piloteado (juega el booster)': { en: 'Piloted (booster plays)', pt: 'Pilotado (o booster joga)' },
      'nivel deseado': { en: 'Desired Level', pt: 'Nível Desejado' },
      'nivel actual': { en: 'Current Level', pt: 'Nível Atual' },
      'selecciona mazmorra:': { en: 'Select Dungeon:', pt: 'Selecionar Masmorra:' },
      'nivel de piedra:': { en: 'Keystone Level:', pt: 'Nível da Pedra:' },
      'en tiempo garantizado (in-time)': { en: 'Beat the Timer (In-time)', pt: 'No tempo garantido (In-time)' },
      'loot trader específico': { en: 'Specific Loot Trader', pt: 'Loot Trader específico' },
      'velocidad express (+20%)': { en: 'Express Speed (+20%)', pt: 'Velocidade Express (+20%)' },
      'transmisión en vivo (discord)': { en: 'Live Stream (Discord)', pt: 'Transmissão ao vivo (Discord)' },
      'opciones adicionales': { en: 'Additional Options', pt: 'Opções Adicionais' },
      'runs': { en: 'Runs', pt: 'Runs' },
      'tu carrito': { en: 'Your Cart', pt: 'Seu Carrinho' },
      'tu carrito de compras': { en: 'Your Shopping Cart', pt: 'Seu Carrinho de Compras' },
      'vaciar carrito': { en: 'Clear Cart', pt: 'Esvaziar Carrinho' },
      'resumen del pedido': { en: 'Order Summary', pt: 'Resumo do Pedido' },
      'subtotal:': { en: 'Subtotal:', pt: 'Subtotal:' },
      'total a pagar': { en: 'Total to Pay', pt: 'Total a Pagar' },
      'proceder al pago': { en: 'Proceed to Checkout', pt: 'Finalizar Compra' },
      'seguir comprando': { en: 'Continue Shopping', pt: 'Continuar Comprando' },
      'tu carrito está vacío': { en: 'Your cart is empty', pt: 'Seu carrinho está vazio' },
      'soporte en vivo': { en: 'Live Support', pt: 'Suporte ao Vivo' },
      'conectado • respuesta inmediata': { en: 'Connected • Instant reply', pt: 'Conectado • Resposta imediata' },
      'escribe tu consulta aquí...': { en: 'Type your message here...', pt: 'Digite sua mensagem aqui...' },
      'mis pedidos': { en: 'My Orders', pt: 'Meus Pedidos' },
      'centro de mensajería (chat)': { en: 'Message Center (Chat)', pt: 'Central de Mensagens (Chat)' },
      'configuración': { en: 'Settings', pt: 'Configurações' },
      'chat con el booster': { en: 'Chat with Booster', pt: 'Chat com o Booster' },
      'hacer oferta (subasta)': { en: 'Place Bid (Auction)', pt: 'Fazer Oferta (Leilão)' },
      'pago actual del booster:': { en: 'Current Booster Payout:', pt: 'Pagamento Atual do Booster:' },
      'oferta máxima permitida:': { en: 'Maximum Allowed Bid:', pt: 'Oferta Máxima Permitida:' },
      'cancelar': { en: 'Cancel', pt: 'Cancelar' },
      'enviar oferta': { en: 'Submit Bid', pt: 'Enviar Oferta' },
      'tomar orden': { en: 'Claim Order', pt: 'Pegar Pedido' },
      'vpn de tu ciudad': { en: "Your City's VPN", pt: 'VPN da sua cidade' },
      'inicio en 15 minutos': { en: 'Start in 15 minutes', pt: 'Início em 15 minutos' },
      'chat privado con tu booster': { en: 'Private Chat with your Booster', pt: 'Chat privado com seu booster' },
      'servicios destacados': { en: 'FEATURED SERVICES', pt: 'SERVIÇOS EM DESTAQUE' },
      'world of warcraft oficial': { en: 'World of Warcraft Official', pt: 'World of Warcraft Oficial' },
      'oficial world of warcraft': { en: 'World of Warcraft Official', pt: 'World of Warcraft Oficial' },
      'selecciona cualquier servicio para ver su página individual y configurar tus opciones.': { en: 'Select any service to view its individual page and configure your options.', pt: 'Selecione cualquier serviço para ver sua página individual e configurar suas opções.' },
      'piedras angulares míticas+, bandas heroicas y míticas, equipamiento bis y powerleveling. protección garantizada con vpn local, seguimiento en vivo de tu orden y chat directo con tu pro.': { en: 'Mythic Keystones+, Heroic and Mythic Raids, BiS Gear, and Powerleveling. Guaranteed protection with local VPN, live order tracking, and direct chat with your pro.', pt: 'Pedras-chave Míticas+, Raides Heróicas e Míticas, Equipamento BiS e Powerleveling. Proteção garantida com VPN local, rastreamento ao vivo do seu pedido e chat direto com seu pro.' },
      '+2 a +15 timed': { en: '+2 to +15 Timed', pt: '+2 a +15 no Tempo' },
      '+2 a +20 timed': { en: '+2 to +20 Timed', pt: '+2 a +20 no Tempo' },
      '1 a 80 / 80 personalizado': { en: '1 to 80 / 80 Customized', pt: '1 a 80 / 80 Personalizado' },
      'bis gear 619+': { en: 'BiS Gear 619+', pt: 'Equipamento BiS 619+' },
      'profundidades / delves': { en: 'Depths / Delves', pt: 'Profundezas / Delves' },
      'ver servicio': { en: 'View Service', pt: 'Ver Serviço' },
      'desde': { en: 'FROM', pt: 'A PARTIR DE' },
      'configurar': { en: 'CONFIGURE', pt: 'CONFIGURAR' },
      'temporada 2 activa': { en: 'Season 2 Active', pt: 'Temporada 2 Ativa' },
      'nueva raid temporada 2': { en: 'New Raid Season 2', pt: 'Novo Raide Temporada 2' },
      'sweet spot tier 8': { en: 'Sweet Spot Tier 8', pt: 'Ponto Ideal Tier 8' },
      'paquete completo': { en: 'Complete Package', pt: 'Pacote Completo' },
      'gana un 50% extra:': { en: 'Earn an extra 50%:', pt: 'Ganhe 50% extra:' },
      'gana 50% extra:': { en: 'Earn an extra 50%:', pt: 'Ganhe 50% extra:' },
      'copiar enlace pro (50%)': { en: 'Copy Link Pro (50%)', pt: 'Copiar Link Pro (50%)' },
      'el abismo venenoso (the venomous abyss)': { en: 'The Venomous Abyss', pt: 'The Venomous Abyss' },
      'mítica+ keystone run (+2 a +15)': { en: 'Mythic+ Keystone Run (+2 to +15)', pt: 'Mítica+ Keystone Run (+2 a +15)' },
      'mítica+ keystone run (+2 a +20)': { en: 'Mythic+ Keystone Run (+2 to +20)', pt: 'Mítica+ Keystone Run (+2 a +20)' },
      'delves tier 8-11 & némesis de temporada': { en: 'Delves Tier 8-11 & Season Nemesis', pt: 'Delves Tier 8-11 & Nêmesis de Temporada' },
      'full equipamiento de temporada (ilvl 292 - 344)': { en: 'Full Season Gear (ilvl 292 - 344)', pt: 'Equipamento Completo de Temporada (ilvl 292 - 344)' },
      'completa mazmorras míticas plus de midnight a tiempo con nuestro equipo profesional. obtén botín hasta 311 ilvl en cofre final y 318 ilvl (mítico) en tu gran cámara semanal.': {
        en: "Complete Midnight's Mythic+ dungeons on time with our professional team. Earn loot up to 311 ilvl in final chest and 318 ilvl (Mythic) in your weekly Grand Vault.",
        pt: "Complete masmorras míticas plus de Midnight no tempo com nossa equipe profissional. Obtenha saques de até 311 ilvl no baú final e 318 ilvl (Mítico) no seu Grande Cofre semanal."
      },
      'derrota a los 8 jefes del abismo venenoso en las cámaras de atal\'utek incluyendo a ula\'tek. botín garantizado de 292 a 344 ilvl, logro ahead of the curve (aotc) / cutting edge y recompensas bis de temporada.': {
        en: "Defeat all 8 bosses of the Poisonous Abyss in the Atal'Utek Vaults, including Ula'tek. Guaranteed loot from 292 to 344 ilvl, Ahead of the Curve (AOTC) / Cutting Edge achievement and season BiS rewards.",
        pt: "Derrote todos os 8 chefes do Abismo Venenoso nas Câmaras de Atal'Utek, incluindo Ula'tek. Saques garantidos de 292 a 344 ilvl, conquista Ahead of the Curve (AOTC) / Cutting Edge e recompensas BiS da temporada."
      },
      'completa profundidades abundantes tier 8 (sweet spot) para botín directo de 295-298 ilvl (campeón) en cofre abundante con llave y gran cámara semanal de 308-311 ilvl (héroe). desbloquea hasta 3 ranuras semanales.': {
        en: "Complete Tier 8 Abundant Delves (Sweet Spot) for direct 295-298 ilvl (Champion) loot in Bountiful Chest with Key and 308-311 ilvl (Hero) weekly Grand Vault. Unlocks up to 3 weekly slots.",
        pt: "Complete Profundezas Abundantes Tier 8 (Ponto Ideal) para saque direto de 295-298 ilvl (Campeão) no Baú Abundante com Chave e Grande Cofre semanal de 308-311 ilvl (Herói). Desbloqueia até 3 espaços semanais."
      },
      'equipa a tu personaje con los mejores objetos de la temporada actual mediante míticas+, delves tier 8 y raid el abismo venenoso. tu personaje listo para míticas altas y pvp.': {
        en: "Equip your character with the season's top gear through Mythic+, Tier 8 Delves, and The Venomous Abyss Raid. Ready for high keys and PvP.",
        pt: "Equipe seu personagem com os melhores itens da temporada atual através de Míticas+, Delves Tier 8 e Raide O Abismo Venenoso. Seu personagem pronto para míticas altas e PvP."
      },
      'sube a tu personaje desde cualquier nivel (1 al 80/90) en tiempo récord. elige tu nivel actual y deseado con nuestra calculadora interactiva en tiempo real, métodos 100% manuales y seguros.': {
        en: "Level up your character from any level (1 to 80/90) in record time. Choose your current and desired level with our real-time interactive calculator, 100% manual and secure methods.",
        pt: "Suba seu personagem de qualquer nível (1 ao 80/90) em tempo recorde. Escolha seu nível atual e desejado com nossa calculadora interativa em tempo real, métodos 100% manuais e seguros."
      },
      'total del carrito:': { en: 'Cart Total:', pt: 'Total do Carrinho:' },
      'proceder al pago / checkout': { en: 'Proceed to Checkout', pt: 'Finalizar Compra / Checkout' },
      'world of warcraft es una marca registrada de blizzard entertainment, inc. mythic progression es una plataforma independiente de servicios.': { en: 'World of Warcraft is a registered trademark of Blizzard Entertainment, Inc. Mythic Progression is an independent service platform.', pt: 'World of Warcraft é uma marca registrada da Blizzard Entertainment, Inc. Mythic Progression é uma plataforma de serviços independente.' },
      'wow carry & mythic services': { en: 'WoW Carry & Mythic Services', pt: 'WoW Carry & Mythic Services' },
      '1 a 80 / 90 personalizado': { en: '1 to 80 / 90 Customized', pt: '1 a 80 / 90 Personalizado' },
      'piedras angulares míticas plus': { en: 'MYTHIC PLUS KEYSTONES', pt: 'PEDRAS-CHAVE MÍTICAS PLUS' },
      'runs garantizados a tiempo con traders de armadura específicos para equipar tu personaje y desbloquear tu gran cámara semanal.': {
        en: 'Guaranteed in-time runs with specific armor traders to gear your character and unlock your weekly Grand Vault.',
        pt: 'Runs garantidos no tempo com traders de armadura específicos para equipar seu personagem e desbloquear seu Grande Cofre semanal.'
      },
      'tu carrito de compra': { en: 'Your Shopping Cart', pt: 'Seu Carrinho de Compra' },
      'servicios seleccionados para tu personaje': { en: 'Services selected for your character', pt: 'Serviços selecionados para seu personagem' },
      'al completar el pedido serás redirigido a tu panel de cliente donde podrás coordinar el horario y detalles en el chat privado con tu booster.': {
        en: 'Upon completing your order you will be redirected to your client dashboard where you can coordinate timing and details in private chat with your booster.',
        pt: 'Ao concluir o pedido, você será redirecionado para o painel do cliente, onde poderá combinar horário e detalhes no chat privado com seu booster.'
      },
      'completar pedido (simular pago)': { en: 'Complete Order (Simulate Payment)', pt: 'Completar Pedido (Simular Pagamento)' },
      'bandas y asaltos míticos': { en: 'Raids & Mythic Assaults', pt: 'Raides & Assaltos Míticos' },
      'derrota a los jefes de raid más desafiantes con hermandades top mundiales. botín de nivel héroe y mito garantizado.': {
        en: 'Defeat the most challenging raid bosses with top world guilds. Guaranteed Hero and Mythic quality loot.',
        pt: 'Derrote os chefes de raide mais desafiadores com guildas de topo mundial. Saque de qualidade Herói e Mito garantido.'
      },
      'powerleveling profesional': { en: 'Professional Powerleveling', pt: 'Powerleveling Profissional' },
      'sube de nivel en tiempo récord de forma 100% manual y segura con vpn dedicada. sin bots ni riesgos.': {
        en: 'Level up in record time, 100% manually and safely with dedicated VPN. No bots, zero risk.',
        pt: 'Suba de nível em tempo recorde, 100% manual e seguro com VPN dedicada. Sem bots, risco zero.'
      },
      'equipamiento y gear bis': { en: 'Gearing & BiS Gear', pt: 'Equipamento e Gear BiS' },
      'optimiza tu item level con piezas de las fuentes más altas del juego: míticas altas, bandas y delves t8.': {
        en: 'Optimize your item level with pieces from the highest endgame sources: high M+, Raids, and Tier 8 Delves.',
        pt: 'Otimize seu nível de item com peças das fontes mais altas do jogo: Míticas altas, Raides e Delves T8.'
      },
      'descripción': { en: 'Description', pt: 'Descrição' },
      'descripcion': { en: 'Description', pt: 'Descrição' },
      '¿qué obtienes con nuestro servicio de míticas+?:': { en: 'What do you get with our Mythic+ service?:', pt: 'O que você ganha com nosso serviço de Míticas+?:' },
      'compra boost de mazmorras míticas+ de wow midnight y completa piedras angulares de alto nivel con un equipo profesional sin lidiar con grupos aleatorios o piedras fallidas. aumenta tu puntuación m+, equipa a tu personaje y asegura recompensas semanales valiosas en la gran cámara.': {
        en: 'Buy WoW Midnight Mythic+ dungeon boost and complete high-level keystones with a pro team without pug frustration or depleted keys. Boost your M+ score, gear your character, and secure valuable weekly Grand Vault rewards.',
        pt: 'Compre boost de masmorras Míticas+ de WoW Midnight e complete pedras de alto nível com uma equipe profissional sem lidar com grupos aleatórios ou pedras quebradas. Aumente seu score M+, equipe seu personagem e garanta recompensas valiosas no Grande Cofre semanal.'
      },
      'runs de mazmorras míticas+ de la temporada oficial midnight con los mejores equipos de boosters de élite (master boosters).': {
        en: 'Midnight official season Mythic+ dungeon runs with top elite booster teams (Master Boosters).',
        pt: 'Runs de masmorras Míticas+ da temporada oficial Midnight com as melhores equipes de boosters de elite (Master Boosters).'
      },
      'equipo garantizado de hasta 318 ilvl en la gran cámara semanal para acelerar tu progresión.': {
        en: 'Guaranteed gear up to 318 ilvl in the weekly Grand Vault to fast-track your progression.',
        pt: 'Equipamento garantido de até 318 ilvl no Grande Cofre semanal para acelerar sua progressão.'
      },
      'probabilidad de obtener botín de 311 ilvl en el cofre al finalizar la mazmorra con tus traders de armadura.': {
        en: 'Chance of 311 ilvl end-of-dungeon chest loot with your armor traders.',
        pt: 'Chance de saque de 311 ilvl no baú final da masmorra com seus traders de armadura.'
      },
      'temporizador garantizado gratis (in-time) para piedras angulares de hasta nivel +13.': {
        en: 'FREE guaranteed timer (In-Time) for keystones up to level +13.',
        pt: 'Temporizador garantido GRÁTIS (In-Time) para pedras-chave até o nível +13.'
      },
      'añadir a favoritos': { en: 'Add to Favorites', pt: 'Adicionar aos Favoritos' },
      'anadir a favoritos': { en: 'Add to Favorites', pt: 'Adicionar aos Favoritos' },
      'mazmorras': { en: 'Dungeons', pt: 'Masmorras' },
      'inicio estimado': { en: 'Estimated Start', pt: 'Início Estimado' },
      'tiempo de ejecución': { en: 'Execution Time', pt: 'Tempo de Execução' },
      'tiempo de ejecucion': { en: 'Execution Time', pt: 'Tempo de Execução' },
      'ssl seguro': { en: 'Secure SSL', pt: 'SSL Seguro' },
      'más opiniones ▾': { en: 'More Reviews ▾', pt: 'Mais Avaliações ▾' },
      'mas opiniones ▾': { en: 'More Reviews ▾', pt: 'Mais Avaliações ▾' },
      'aplicar código de descuento': { en: 'Apply Discount Code', pt: 'Aplicar Código de Desconto' },
      'aplicar codigo de descuento': { en: 'Apply Discount Code', pt: 'Aplicar Código de Desconto' },
      'aplicar': { en: 'Apply', pt: 'Aplicar' },
      'añade 1 run más para 5% de descuento': { en: 'Add 1 more run for 5% discount', pt: 'Adicione mais 1 run para 5% de desconto' },
      'anade 1 run mas para 5% de descuento': { en: 'Add 1 more run for 5% discount', pt: 'Adicione mais 1 run para 5% de desconto' },
      '450 reinos encontrados': { en: '450 realms found', pt: '450 reinos encontrados' },
      'selecciona uno': { en: 'Select one', pt: 'Selecione um' },
      'ej: shadow': { en: 'Ex: Shadow', pt: 'Ex: Shadow' },
      "buscar reino (ej: ragnaros, quel'thalas, whitemane, forever...)": { en: "Search realm (e.g. Ragnaros, Quel'Thalas, Whitemane, Forever...)", pt: "Buscar reino (ex: Ragnaros, Quel'Thalas, Whitemane, Forever...)" },
      'timer garantizado (in-time)': { en: 'Beat the Timer (In-Time)', pt: 'No tempo garantido (In-Time)' },
      'sin traders (+0$)': { en: 'No traders (+$0)', pt: 'Sem traders (+R$0)' },
      '1 trader (+10$)': { en: '1 Trader (+$10)', pt: '1 Trader (+R$10)' },
      '2 traders (+18$)': { en: '2 Traders (+$18)', pt: '2 Traders (+R$18)' },
      '3 traders (+25$)': { en: '3 Traders (+$25)', pt: '3 Traders (+R$25)' },
      'nivel de piedra angular (keystone):': { en: 'Keystone Level:', pt: 'Nível da Pedra Angular (Keystone):' },
      'mazmorra específica:': { en: 'Specific Dungeon:', pt: 'Masmorra Específica:' },
      'mazmorra especifica:': { en: 'Specific Dungeon:', pt: 'Masmorra Específica:' },
      'traders de armadura:': { en: 'Armor Traders:', pt: 'Traders de Armadura:' },
      'acceso con discord': { en: 'Discord Sign In', pt: 'Entrar com Discord' },
      'sincronizado con el bot oficial': { en: 'Synced with Official Bot', pt: 'Sincronizado com o Bot Oficial' },
      'mythic progression bot oficial': { en: 'Mythic Progression Official Bot', pt: 'Mythic Progression Bot Oficial' },
      'en línea': { en: 'Online', pt: 'Online' },
      'en linea': { en: 'Online', pt: 'Online' },
      'verificación oficial • conexión cifrada oauth2': { en: 'Official Verification • OAuth2 Encrypted Connection', pt: 'Verificação Oficial • Conexão Criptografada OAuth2' },
      'verificacion oficial • conexion cifrada oauth2': { en: 'Official Verification • OAuth2 Encrypted Connection', pt: 'Verificação Oficial • Conexão Criptografada OAuth2' },
      'iniciar sesión con discord': { en: 'Sign In with Discord', pt: 'Entrar com Discord' },
      'iniciar sesion con discord': { en: 'Sign In with Discord', pt: 'Entrar com Discord' },
      'conexión oauth2 segura. reconoce automáticamente tu rango oficial.': { en: 'Secure OAuth2 connection. Automatically detects your official rank.', pt: 'Conexão OAuth2 segura. Reconhece automaticamente seu cargo oficial.' },
      'conexion oauth2 segura. reconoce automaticamente tu rango oficial.': { en: 'Secure OAuth2 connection. Automatically detects your official rank.', pt: 'Conexão OAuth2 segura. Reconhece automaticamente seu cargo oficial.' },
      'o ingresa manualmente': { en: 'Or enter manually', pt: 'Ou entre manualmente' },
      'tu discord id, tag o usuario:': { en: 'Your Discord ID, Tag or Username:', pt: 'Seu Discord ID, Tag ou Usuário:' },
      'entrar': { en: 'Enter', pt: 'Entrar' },
      'acceso protegido para clientes y boosters autorizados.': { en: 'Protected access for authorized Clients and Boosters.', pt: 'Acesso protegido para Clientes e Boosters autorizados.' },
      'bienvenido,': { en: 'Welcome,', pt: 'Bem-vindo,' },
      'gestiona tus pedidos activos, comunícate con tu booster y actualiza tus datos.': { en: 'Manage active orders, communicate with your booster, and update your profile.', pt: 'Gerencie seus pedidos ativos, converse com seu booster e atualize seus dados.' },
      'tus pedidos en curso': { en: 'Your Active Orders', pt: 'Seus Pedidos em Andamento' },
      'haz clic en "chat con el booster" para hablar directamente con el jugador profesional asignado a tu pedido.': { en: 'Click "Chat with Booster" to speak directly with the pro player assigned to your order.', pt: 'Clique em "Chat com o Booster" para falar diretamente com o jogador profissional do seu pedido.' },
      'nuevo servicio': { en: 'New Service', pt: 'Novo Serviço' },
      'configuración de cuenta': { en: 'Account Settings', pt: 'Configurações de Conta' },
      'configuracion de cuenta': { en: 'Account Settings', pt: 'Configurações de Conta' },
      'billetera / pagos': { en: 'Wallet / Payouts', pt: 'Carteira / Pagamentos' },
      'mi perfil pro': { en: 'My Pro Profile', pt: 'Meu Perfil Pro' },
      'ver tienda con pro': { en: 'View Store as Pro', pt: 'Ver Loja como Pro' },
      'bolsa de pedidos (find orders)': { en: 'Order Board (Find Orders)', pt: 'Mural de Pedidos (Find Orders)' },
      'toma órdenes al 30% base o puja en subasta hasta el límite del 50%.': { en: 'Claim orders at 30% base or bid in auction up to 50% max.', pt: 'Pegue pedidos a 30% base ou dê lances no leilão até o limite de 50%.' },
      'cargando...': { en: 'Loading...', pt: 'Carregando...' },
      'self-play (juegas tú)': { en: 'Self-play (you play)', pt: 'Self-play (você joga)' },
      'piloted (juega un pro)': { en: 'Piloted (pro plays)', pt: 'Pilotado (um pro joga)' },
      'piloted (juega un pro con vpn)': { en: 'Piloted (pro plays with VPN)', pt: 'Pilotado (um pro joga com VPN)' },
      'self-play (juegas tú con la hermandad)': { en: 'Self-play (play with guild)', pt: 'Self-play (você joga com a guilda)' },
      'piloted (vpn de tu ciudad)': { en: 'Piloted (your city VPN)', pt: 'Pilotado (VPN da sua cidade)' },
      'self-play (juegas tú con nuestro pro)': { en: 'Self-play (play with our pro)', pt: 'Self-play (você joga com nosso pro)' },
      'piloted (vpn de tu país)': { en: 'Piloted (your country VPN)', pt: 'Pilotado (VPN do seu país)' },
      'self-play (juegas en grupo con pros)': { en: 'Self-play (play with pros)', pt: 'Self-play (você joga em grupo com pros)' },
      'piloted (vpn)': { en: 'Piloted (VPN)', pt: 'Pilotado (VPN)' },
      'not required': { en: 'Not Required', pt: 'Não Necessário' }
    };

    const isProtected = (el) => {
      if (!el) return true;
      if (el.closest('#mp-live-chat-root')) return true;
      if (el.closest('#header-lang-selector')) return true;
      if (el.closest('#user-session-badge')) return true;
      if (el.closest('.product-card-title') || el.classList.contains('product-card-title')) return true;
      if (el.closest('.player-role') || el.classList.contains('player-role')) return true;
      return false;
    };

    if (lang === 'es') {
      // Restore Spanish
      document.querySelectorAll('[data-i18n-orig]').forEach(el => {
        if (isProtected(el)) return;
        const orig = el.getAttribute('data-i18n-orig');
        const icon = el.querySelector('i');
        if (icon) {
          el.innerHTML = '';
          el.appendChild(icon);
          el.appendChild(document.createTextNode(' ' + orig));
        } else {
          el.textContent = orig;
        }
      });
      document.querySelectorAll('[data-i18n-orig-ph]').forEach(el => {
        if (isProtected(el)) return;
        el.setAttribute('placeholder', el.getAttribute('data-i18n-orig-ph'));
      });
      this.cleanupGoogleTranslate();
      return;
    }

    // Translate Inputs & Placeholders
    document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(el => {
      if (isProtected(el)) return;
      const raw = el.getAttribute('data-i18n-orig-ph') || el.getAttribute('placeholder') || '';
      const clean = raw.replace(/\s+/g, ' ').trim();
      if (!el.hasAttribute('data-i18n-orig-ph')) el.setAttribute('data-i18n-orig-ph', clean);
      const key = clean.toLowerCase();
      if (dict[key] && dict[key][lang]) {
        el.setAttribute('placeholder', dict[key][lang]);
      }
    });

    // Translate DOM Elements (leaf elements, headers, paragraphs, buttons, divs, options, etc.)
    const elements = document.querySelectorAll('span, button, a, label, h1, h2, h3, h4, h5, p, strong, div, option, li, th, td');
    elements.forEach(el => {
      if (isProtected(el)) return;

      // Only process leaf elements or elements containing only an <i> or <svg> or <br>
      const nonLeafChildren = Array.from(el.children).filter(c => {
        const tag = c.tagName.toLowerCase();
        return tag !== 'i' && tag !== 'svg' && tag !== 'br';
      });
      if (nonLeafChildren.length > 0) return;

      const raw = el.getAttribute('data-i18n-orig') || el.textContent || '';
      const cleanText = raw.replace(/\s+/g, ' ').trim();
      if (!cleanText) return;

      const key = cleanText.toLowerCase();

      if (dict[key] && dict[key][lang]) {
        if (!el.hasAttribute('data-i18n-orig')) el.setAttribute('data-i18n-orig', cleanText);
        const icon = el.querySelector('i');
        if (icon) {
          el.innerHTML = '';
          el.appendChild(icon);
          el.appendChild(document.createTextNode(' ' + dict[key][lang]));
        } else {
          el.textContent = dict[key][lang];
        }
      }
    });

    // Clean up any stray Google Translate frames/cookies
    this.cleanupGoogleTranslate();
  }

  cleanupGoogleTranslate() {
    try {
      if (typeof document === 'undefined') return;
      const host = (typeof window !== 'undefined' && window.location) ? window.location.hostname : '';
      const domainVariants = ['', host, '.' + host];
      if (host.includes('.')) {
        const parts = host.split('.');
        if (parts.length > 2) {
          const rootDomain = parts.slice(-2).join('.');
          domainVariants.push(rootDomain, '.' + rootDomain);
        }
      }
      const paths = ['/', '/mplus', '/raids', '/leveling', '/gearing', '/pro', '/admin', '/client-profile', '/product'];
      domainVariants.forEach(dom => {
        paths.forEach(p => {
          document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${p};` + (dom ? ` domain=${dom};` : '');
          document.cookie = `googtrans_v2=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${p};` + (dom ? ` domain=${dom};` : '');
        });
      });

      const el = document.getElementById('google_translate_element');
      if (el) el.remove();
      const style = document.getElementById('mp-gt-custom-styles');
      if (style) style.remove();

      document.querySelectorAll('script[src*="translate.google.com"], script[src*="element.js"]').forEach(s => s.remove());

      const frames = document.querySelectorAll('.goog-te-banner-frame, #goog-gt-tt, .goog-te-balloon-frame, iframe.goog-te-menu-frame, .VIpgJd-ZVi9od-ORHb-OJyqT, .skiptranslate');
      frames.forEach(f => {
        if (f.tagName.toLowerCase() === 'iframe' || f.id === 'goog-gt-tt' || f.classList.contains('goog-te-banner-frame') || f.classList.contains('VIpgJd-ZVi9od-ORHb-OJyqT') || f.classList.contains('goog-te-balloon-frame')) {
          f.remove();
        }
      });

      const body = document.body;
      if (body) {
        body.classList.remove('translated-ltr', 'translated-rtl');
        body.style.top = '0px';
        body.style.position = '';
      }
      if (document.documentElement) {
        document.documentElement.classList.remove('translated-ltr', 'translated-rtl');
      }
    } catch (e) {}
  }
}

const app = new MythicApp();
window.app = app;
window.openAuthModal = () => app.openAuthModal();
window.closeAuthModal = () => app.closeAuthModal();
window.handleDiscordLogin = () => app.handleDiscordLogin();
window.logout = () => app.logout();
window.openLiveChat = (opts) => app.openLiveChat(opts);
window.toggleLiveChat = () => app.toggleLiveChat();
window.setLanguage = (lang) => app.setLanguage(lang);
window.toggleLangDropdown = (e) => app.toggleLangDropdown(e);


