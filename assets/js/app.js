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
    this.init();
  }

  async init() {
    await this.loadInitialData();
    await this.checkDiscordOAuthCallback();
    this.initSession();
    this.renderHeader();
    this.setupLiveSearch();
    this.updateCartCounter();

    const path = window.location.pathname.toLowerCase();
    if (path.includes('product.html')) {
      this.initSingleProductPage();
    } else if (path.includes('client-profile.html')) {
      this.initClientProfile();
    } else if (path.includes('pro.html')) {
      this.initProPortal();
    } else if (path.includes('admin.html')) {
      this.initAdminPortal();
    } else if (path.includes('mplus.html')) {
      this.initCategoryPage('Míticas Plus');
    } else if (path.includes('raids.html')) {
      this.initCategoryPage('Bandas / Raids');
    } else if (path.includes('leveling.html')) {
      this.initCategoryPage('Powerleveling');
    } else if (path.includes('gearing.html')) {
      this.initCategoryPage('Equipo / ilvl');
    } else {
      this.initStoreFront();
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
            if (!b.avatar) {
              const backup = localStorage.getItem('mp_discord_avatar_backup');
              if (backup) b.avatar = backup;
            }
          }
        });
      }
    } catch (e) {
      console.warn('Fallback loading boosters:', e);
      if (!this.boosters || this.boosters.length === 0) this.boosters = [];
    }

    // 2. Services
    try {
      const storedServices = localStorage.getItem('mp_services');
      if (storedServices && JSON.parse(storedServices).length > 0) {
        this.services = JSON.parse(storedServices);
      } else {
        const res = await fetch('data/seed_services.json');
        this.services = await res.json();
        this.saveServices();
      }

      // Upgrade existing stored services with rich M+ options if not present
      if (this.services && Array.isArray(this.services)) {
        const mplus = this.services.find(s => s.id === 'mplus-keystone');
        if (mplus) {
          if (!mplus.options || !mplus.options.lootTraders || !mplus.options.completionMethods) {
            mplus.options = {
              keyLevels: [
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
              ],
              timer: { enabled: true, label: 'Timer guaranteed', price: 0 },
              lootTraders: [
                { label: 'Premium Group (x2 loot-traders)', price: 0 },
                { label: 'VIP Group (+3 loot-traders)', price: 2.27 },
                { label: 'Top Group (+4 loot-traders)', price: 2.92 }
              ],
              dungeons: [
                'Random Dungeon (Más Rápido)',
                'The Stonevault',
                'City of Threads',
                'The Dawnbreaker',
                'Ara-Kara, City of Echoes',
                'Grim Batol',
                'The Necrotic Wake',
                'Mists of Tirna Scithe',
                'Siege of Boralus'
              ],
              completionMethods: [
                { label: 'Self-play', price: 0, tag: 'Gratis' },
                { label: 'Piloted (Juega un Pro con VPN)', price: 0, tag: 'Incluido' },
                { label: 'Self-play Remote', price: 1.95, tag: '+$1.95' }
              ],
              extras: [
                { label: 'Rank One Team', price: 1.95 },
                { label: 'Stream Privado en Discord', price: 2.50 }
              ],
              estimates: { start: '10-15 min', execution: '15-30 min' },
              heroBadges: ['311 ilvl Gear', '318 Weekly Vault', 'FREE Timer & Traders'],
              volumeDiscount: 5,
              cashbackPercent: 5,
              ...(mplus.options || {})
            };
            this.saveServices();
          }
        }
      }
    } catch (e) {
      console.warn('Fallback loading services:', e);
      if (!this.services || this.services.length === 0) this.services = [];
    }

    // 3. Orders
    try {
      const storedOrders = localStorage.getItem('mp_orders');
      if (storedOrders && JSON.parse(storedOrders).length > 0) {
        this.orders = JSON.parse(storedOrders);
      } else {
        const res = await fetch('data/seed_orders.json');
        this.orders = await res.json();
        this.saveOrders();
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
  }

  initSession() {
    const stored = localStorage.getItem('mp_current_user');
    if (stored) {
      try {
        this.currentUser = JSON.parse(stored);
        if (this.currentUser) {
          // Normalize multi-roles
          if (!this.currentUser.roles || !Array.isArray(this.currentUser.roles)) {
            this.currentUser.roles = [this.currentUser.role || (this.currentUser.type === 'admin' ? 'Staff / Admin' : 'Booster')];
          }
          if (this.currentUser.discordId === '443948776562884620' || (this.currentUser.username && this.currentUser.username.toLowerCase() === 'miguelb')) {
            this.currentUser.type = 'admin';
            this.currentUser.isAdmin = true;
            this.currentUser.isBooster = true;
            if (!this.currentUser.roles.includes('Master Booster')) this.currentUser.roles.unshift('Master Booster');
            if (!this.currentUser.roles.includes('Staff / Admin')) this.currentUser.roles.push('Staff / Admin');
            this.currentUser.role = 'Master Booster & Admin';
          }

          // Restore avatar if missing from persistent backup or booster database
          if (!this.currentUser.avatar) {
            const bMatch = this.boosters && this.boosters.find(b => (this.currentUser.discordId && b.discord_id === this.currentUser.discordId) || (this.currentUser.username && b.username.toLowerCase() === this.currentUser.username.toLowerCase()));
            const backup = localStorage.getItem('mp_discord_avatar_backup');
            if (bMatch && bMatch.avatar) {
              this.currentUser.avatar = bMatch.avatar;
            } else if (backup) {
              this.currentUser.avatar = backup;
            }
          } else {
            localStorage.setItem('mp_discord_avatar_backup', this.currentUser.avatar);
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
  }

  saveServices() {
    localStorage.setItem('mp_services', JSON.stringify(this.services));
  }

  saveBoosters() {
    localStorage.setItem('mp_boosters', JSON.stringify(this.boosters));
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
  authenticateWithDiscord(discordId, customName = null) {
    const inputStr = String(discordId || customName || '').trim().toLowerCase();
    
    // Check if logging in as Admin/Gerente or Miguelb (Owner)
    if (inputStr === 'admin' || inputStr === 'gerente' || inputStr === 'gerencia' || inputStr === 'staff' || inputStr.includes('mythicadmin') || inputStr === '443948776562884620' || inputStr === 'miguelb') {
      return this.authenticateAsAdmin();
    }

    // Check if it's one of the pre-approved boosters
    const existingBooster = this.boosters.find(b => 
      b.discord_id === String(discordId).trim() || 
      b.username.toLowerCase() === String(customName || discordId).trim().toLowerCase()
    );

    if (existingBooster) {
      const isStaffOrAdmin = existingBooster.discord_id === '443948776562884620' ||
        (existingBooster.roles && existingBooster.roles.some(r => /admin|staff|gerente/i.test(r))) ||
        (existingBooster.role && /admin|staff|gerente/i.test(existingBooster.role));

      const bRoles = Array.isArray(existingBooster.roles) ? [...existingBooster.roles] : [existingBooster.role || 'Booster'];
      if (isStaffOrAdmin && !bRoles.some(r => /admin|staff/i.test(r))) {
        bRoles.push('Staff / Admin');
      }

      this.currentUser = {
        id: 'booster_' + existingBooster.discord_id,
        type: isStaffOrAdmin ? 'admin' : 'booster',
        discordId: existingBooster.discord_id,
        username: existingBooster.username,
        role: existingBooster.role || 'Booster',
        roles: bRoles,
        points: existingBooster.points || 0,
        approved: existingBooster.approved,
        balance: existingBooster.balance || 0.00,
        email: existingBooster.email,
        avatar: existingBooster.avatar || '',
        payoutMethod: existingBooster.payout_method || 'Binance Pay / USDT',
        isAdmin: isStaffOrAdmin,
        isBooster: true
      };
      this.saveUser();
      this.showToast(`¡Bienvenido Booster ${existingBooster.username}!`, 'success');
      this.renderHeader();
      return { status: isStaffOrAdmin ? 'ADMIN_LOGGED_IN' : 'BOOSTER_LOGGED_IN', user: this.currentUser };
    }

    // Otherwise client login
    this.currentUser = {
      id: 'client_' + (discordId || 'user'),
      type: 'client',
      username: customName || 'Cliente_' + String(discordId).slice(0, 4),
      role: 'Cliente',
      roles: ['Cliente'],
      email: (customName || 'cliente') + '@discord.com',
      country: 'Global',
      discordId: String(discordId),
      balance: 0.00,
      isAdmin: false,
      isBooster: false
    };
    this.saveUser();
    this.showToast(`¡Bienvenido ${this.currentUser.username}!`, 'success');
    this.renderHeader();
    return { status: 'CLIENT_LOGGED_IN', user: this.currentUser };
  }

  authenticateAsAdmin(avatar = null) {
    const existingAvatar = avatar || 
      this.currentUser?.avatar || 
      (this.boosters && this.boosters.find(b => b.discord_id === '443948776562884620' || b.username.toLowerCase() === 'miguelb')?.avatar) || 
      localStorage.getItem('mp_discord_avatar_backup') || 
      '';

    this.currentUser = {
      id: 'admin_miguelb',
      type: 'admin',
      username: 'Miguelb',
      role: 'Master Booster & Admin',
      roles: ['Master Booster', 'Staff / Admin'],
      email: 'charquin50@gmail.com',
      country: 'Global',
      discordId: '443948776562884620',
      avatar: existingAvatar,
      points: 546,
      approved: true,
      balance: 0.00,
      payoutMethod: 'Binance Pay / USDT',
      isAdmin: true,
      isBooster: true
    };
    if (existingAvatar) {
      localStorage.setItem('mp_discord_avatar_backup', existingAvatar);
      if (this.boosters) {
        const b = this.boosters.find(x => x.discord_id === '443948776562884620' || x.username.toLowerCase() === 'miguelb');
        if (b) {
          b.avatar = existingAvatar;
          this.saveBoosters();
        }
      }
    }
    this.saveUser();
    this.renderHeader();
    this.showToast('¡Sesión iniciada como Administrador & Master Booster (Miguelb)!', 'success');
    return { status: 'ADMIN_LOGGED_IN', user: this.currentUser };
  }

  loginAsAdminQuick() {
    this.authenticateAsAdmin();
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.add('hidden');
    window.location.href = 'admin.html';
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
        b.discord_id === discordId || b.username.toLowerCase() === username.toLowerCase()
      ) : null;

      if (discordId === '443948776562884620' || username.toLowerCase() === 'miguelb' || username.toLowerCase().includes('admin')) {
        this.currentUser.isAdmin = true;
        this.currentUser.isBooster = true;
        this.currentUser.type = 'admin';
        this.currentUser.role = 'Master Booster & Admin';
        this.currentUser.roles = ['Master Booster', 'Staff / Admin'];
      } else if (existingBooster) {
        this.currentUser.isBooster = true;
        this.currentUser.role = existingBooster.role || 'Booster';
        this.currentUser.roles = existingBooster.roles || [existingBooster.role || 'Booster'];
        this.currentUser.points = existingBooster.points;
        this.currentUser.balance = existingBooster.balance || 0.00;
      }

      this.saveUser();
      this.showToast(`¡Tu cuenta de Discord (${this.currentUser.discordTag}) fue vinculada exitosamente con tu cuenta de Google!`, 'success');
      this.renderHeader();
      const returnUrl = sessionStorage.getItem('mp_oauth_return_url');
      sessionStorage.removeItem('mp_oauth_return_url');
      window.location.href = returnUrl || (this.currentUser.isAdmin ? 'admin.html' : (this.currentUser.isBooster ? 'pro.html' : 'client-profile.html'));
      return;
    }

    // 1. Check if Admin/Staff or Miguelb (Owner)
    if (discordId === '443948776562884620' || username.toLowerCase() === 'miguelb' || username.toLowerCase().includes('admin') || username.toLowerCase().includes('gerente')) {
      const adminRes = this.authenticateAsAdmin(avatar);
      if (avatar) this.currentUser.avatar = avatar;
      if (payload.email) this.currentUser.email = payload.email;
      this.currentUser.discordConnected = true;
      this.currentUser.discordTag = payload.discordTag || `${username}#0`;
      this.saveUser();

      // Sync into boosters list too
      if (this.boosters) {
        const bIdx = this.boosters.findIndex(b => b.discord_id === '443948776562884620' || b.username.toLowerCase() === 'miguelb');
        if (bIdx !== -1) {
          this.boosters[bIdx].avatar = avatar;
          this.saveBoosters();
        }
      }

      const returnUrl = sessionStorage.getItem('mp_oauth_return_url');
      sessionStorage.removeItem('mp_oauth_return_url');
      if (returnUrl && (returnUrl.includes('pro.html') || returnUrl.includes('client-profile.html'))) {
        window.location.href = returnUrl;
      } else {
        window.location.href = 'admin.html';
      }
      return adminRes;
    }

    // 2. Check if Booster in database
    const existingBooster = this.boosters.find(b => 
      b.discord_id === discordId || 
      b.username.toLowerCase() === username.toLowerCase()
    );

    if (existingBooster) {
      const isStaffOrAdmin = (existingBooster.roles && existingBooster.roles.some(r => /admin|staff|gerente/i.test(r))) ||
        (existingBooster.role && /admin|staff|gerente/i.test(existingBooster.role));

      const bRoles = Array.isArray(existingBooster.roles) ? [...existingBooster.roles] : [existingBooster.role || 'Booster'];
      if (isStaffOrAdmin && !bRoles.some(r => /admin|staff/i.test(r))) {
        bRoles.push('Staff / Admin');
      }

      this.currentUser = {
        id: 'booster_' + existingBooster.discord_id,
        type: isStaffOrAdmin ? 'admin' : 'booster',
        discordId: existingBooster.discord_id,
        discordTag: payload.discordTag || `${username}#0`,
        discordConnected: true,
        username: existingBooster.username,
        role: existingBooster.role || 'Booster',
        roles: bRoles,
        points: existingBooster.points,
        approved: existingBooster.approved,
        balance: existingBooster.balance || 0.00,
        email: payload.email || existingBooster.email,
        avatar: payload.avatar || existingBooster.avatar || '',
        payoutMethod: existingBooster.payout_method || 'Binance Pay / USDT',
        isAdmin: isStaffOrAdmin,
        isBooster: true
      };
      this.saveUser();
      this.showToast(`¡Conectado como Booster ${existingBooster.username}!`, 'success');
      this.renderHeader();
      window.location.href = isStaffOrAdmin ? 'admin.html' : 'pro.html';
      return { status: isStaffOrAdmin ? 'ADMIN_LOGGED_IN' : 'BOOSTER_LOGGED_IN', user: this.currentUser };
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
    window.location.href = 'client-profile.html';
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

    const defaultEmail = (this.currentUser && this.currentUser.email) ? this.currentUser.email : 'charquin50@gmail.com';

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
      if (window.location.pathname.includes('client-profile.html') || window.location.pathname.includes('pro.html')) {
        setTimeout(() => location.reload(), 300);
      }
      return;
    }

    // 1. Check if email belongs to Owner / Admin (Miguelb / charquin50@gmail.com)
    if (email === 'charquin50@gmail.com' || email.includes('charquin') || name.toLowerCase().includes('miguelb')) {
      const adminRes = this.authenticateAsAdmin(avatar);
      this.currentUser.googleEmail = email;
      this.currentUser.googleId = googleId;
      this.currentUser.googleConnected = true;
      this.currentUser.discordId = '443948776562884620';
      this.currentUser.discordTag = 'Miguelb#0';
      this.currentUser.discordConnected = true;
      this.currentUser.email = email;
      if (avatar) this.currentUser.avatar = avatar;
      this.saveUser();
      this.showToast(`¡Bienvenido Miguelb! Conectado con Google (${email}) como Master Booster & Admin.`, 'success');
      this.renderHeader();
      window.location.href = 'admin.html';
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
      window.location.href = isStaffOrAdmin ? 'admin.html' : 'pro.html';
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
    window.location.href = 'client-profile.html';
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
    this.authenticateWithDiscord('443948776562884620', 'Miguelb');
    this.closeAuthModal();
    window.location.href = 'pro.html';
  }

  loginAsDemoClient() {
    this.authenticateWithDiscord('987654321012345678', 'Carlos M.');
    this.closeAuthModal();
    window.location.href = 'client-profile.html';
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
    // Generate unique cart item id
    const cartItem = {
      cartId: 'item_' + Date.now() + '_' + Math.floor(Math.random()*1000),
      serviceId: item.serviceId,
      serviceName: item.serviceName,
      category: item.category,
      unitPrice: Number(item.price),
      quantity: Number(item.quantity || 1),
      totalPrice: Number(item.price) * Number(item.quantity || 1),
      character: item.character || 'Personaje-Reino',
      mode: item.mode || 'Self-Play',
      region: item.region || 'US',
      details: item.details || '',
      referredBooster: sessionStorage.getItem('mp_upsell_booster') || null
    };

    this.cart.push(cartItem);
    this.saveCart();
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
    item.totalPrice = item.unitPrice * item.quantity;
    this.saveCart();
    this.renderCartItems();
  }

  getCartTotal() {
    return this.cart.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
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
    const modal = document.getElementById('cart-drawer-modal');
    if (!modal) return;
    this.renderCartItems();
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  closeCartModal() {
    const modal = document.getElementById('cart-drawer-modal');
    if (modal) modal.classList.add('hidden');
  }

  renderCartItems() {
    const container = document.getElementById('cart-items-container');
    const totalElem = document.getElementById('cart-total-display');
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

    container.innerHTML = this.cart.map(item => `
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
            <div class="text-sm font-bold font-mono-gaming text-[#fcefc2]">$${item.totalPrice.toFixed(2)}</div>
            <button onclick="app.removeFromCart('${item.cartId}')" class="text-[10px] text-stone-500 hover:text-red-400">
              <i class="fa-solid fa-trash mr-1"></i>Quitar
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  processFullCartCheckout() {
    if (this.cart.length === 0) return;

    const createdOrderIds = [];
    this.cart.forEach(item => {
      const isUpsell = !!item.referredBooster;
      const econ = this.calculateEconomics(item.totalPrice, isUpsell);

      const newOrder = {
        id: 'MP-' + Math.floor(10000 + Math.random() * 90000),
        serviceName: `${item.serviceName} (x${item.quantity})`,
        category: item.category,
        region: item.region,
        faction: 'Horda',
        realm: (item.character.split('-')[1] || 'Area 52').trim(),
        characterName: item.character,
        completionMethod: item.mode,
        vpnLocation: item.mode === 'Piloted' ? 'Estados Unidos (Chicago)' : 'N/A (Self-play)',
        details: item.details,
        clientId: this.currentUser?.id || 'client_carlos',
        clientEmail: this.currentUser?.email || 'carlos.wow@gmail.com',
        clientDiscord: this.currentUser?.discordId || 'CarlosWoW#4819',
        clientName: this.currentUser?.username || 'Carlos M.',
        totalPrice: item.totalPrice,
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
      window.location.href = 'client-profile.html';
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
          <a href="product.html?id=${s.id}" class="p-3 hover:bg-[#201812] flex items-center justify-between border-b border-stone-800 last:border-0 transition-colors">
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

    // Breadcrumbs & Title
    const titleEl = document.getElementById('sp-title');
    if (titleEl) titleEl.textContent = svc.name;
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

    // Dynamic Time Estimates
    const startEl = document.getElementById('sp-est-start');
    if (startEl && svc.options?.estimates?.start) startEl.textContent = svc.options.estimates.start;
    const execEl = document.getElementById('sp-est-execution');
    if (execEl && svc.options?.estimates?.execution) execEl.textContent = svc.options.estimates.execution;

    this.renderSingleProductOptions(svc);
    this.recalculateSingleProductTotal();
    this.renderRelatedProducts(svc);
  }

  renderSingleProductOptions(svc) {
    const container = document.getElementById('sp-options-form');
    if (!container) return;

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

  updateSpRunsQty(delta) {
    this.currentRunsQuantity = Math.max(1, this.currentRunsQuantity + delta);
    const qtyEl = document.getElementById('sp-runs-qty');
    if (qtyEl) qtyEl.textContent = this.currentRunsQuantity;
    
    // Update discount hint banner
    const volDisc = this.currentProduct?.options?.volumeDiscount !== undefined 
      ? Number(this.currentProduct.options.volumeDiscount) 
      : 5;
    const hintEl = document.getElementById('sp-discount-hint');
    if (hintEl) {
      if (this.currentRunsQuantity === 1) {
        hintEl.textContent = `Añade 1 run más para ${volDisc}% de descuento`;
      } else {
        hintEl.textContent = `¡${this.currentRunsQuantity} runs seleccionadas! ${volDisc}% de descuento por volumen aplicado.`;
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
    let unit = this.currentSpKeyPrice || this.currentProduct?.basePrice || 38.00;

    // Loot-traders extra
    const traderInput = document.querySelector('input[name="sp_traders"]:checked');
    if (traderInput) unit += Number(traderInput.value || 0);

    // Timer extra
    const timerInput = document.getElementById('sp-opt-timer');
    if (timerInput && timerInput.checked) unit += Number(timerInput.dataset.price || 0);

    // Completion method extra
    const modeInput = document.querySelector('input[name="sp_mode"]:checked');
    if (modeInput) unit += Number(modeInput.dataset.price || 0);

    // Extras checkboxes
    const extraCheckboxes = document.querySelectorAll('input[name="sp_extra_option"]:checked');
    extraCheckboxes.forEach(cb => {
      unit += Number(cb.dataset.price || 0);
    });

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
    const char = document.getElementById('sp-character')?.value.trim() || this.currentUser?.battletag || 'Heroe-Ragnaros';
    const region = document.getElementById('sp-region')?.value || 'US';
    const dungeon = document.getElementById('sp-dungeon-select')?.value || 'Random Dungeon';
    const selectedMode = document.querySelector('input[name="sp_mode"]:checked')?.value || 'Self-play';

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
      unitPrice: this.currentUnitCalcPrice,
      quantity: this.currentRunsQuantity || 1,
      totalPrice: this.currentTotalCalculated || this.currentUnitCalcPrice,
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
              <h3 class="text-lg font-bold text-white group-hover:text-[#fcefc2] transition-colors">${svc.name}</h3>
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
          <a href="product.html?id=${svc.id}" class="px-5 py-2.5 rounded-xl copper-gradient-bg font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:opacity-95 transition-all shadow-md">
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
            <span class="text-2xl font-bold font-mono-gaming text-[#fcefc2]">$${orderItem.price.toFixed(2)}</span>
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

    const isUpsell = !!item.referredBooster;
    const econ = this.calculateEconomics(item.price, isUpsell);

    const newOrder = {
      id: item.orderId,
      serviceName: item.serviceName,
      category: item.category,
      region: item.region,
      faction: 'Horda',
      realm: item.character.split('-')[1] || 'Área 52',
      characterName: item.character,
      completionMethod: item.mode,
      vpnLocation: item.mode === 'Piloted' ? 'Estados Unidos (Chicago)' : 'N/A (Self-play)',
      details: item.details,
      clientId: this.currentUser?.id || 'client_guest',
      clientEmail: this.currentUser?.email || 'cliente@mythicprogression.com',
      clientDiscord: this.currentUser?.discordId || 'ClienteWoW#1024',
      clientName: this.currentUser?.username || 'Aventurero',
      totalPrice: item.price,
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
      window.location.href = 'client-profile.html';
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
    const user = this.currentUser;
    if (!user) return;

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

  renderClientOrders() {
    const container = document.getElementById('client-orders-list');
    if (!container) return;

    const myOrders = this.orders.filter(o => 
      o.clientId === this.currentUser?.id || 
      o.clientEmail === this.currentUser?.email ||
      o.clientName === this.currentUser?.username
    );

    if (myOrders.length === 0) {
      container.innerHTML = `
        <div class="glass-panel p-10 rounded-2xl text-center">
          <i class="fa-solid fa-receipt text-3xl text-stone-600 mb-2"></i>
          <h4 class="text-sm font-bold text-stone-300">Aún no tienes pedidos activos</h4>
          <p class="text-xs text-stone-500 mt-1">Explora nuestra tienda para adquirir tu primera piedra mítica o raid.</p>
          <a href="index.html" class="inline-block mt-4 px-4 py-2 rounded-xl copper-gradient-bg font-bold text-xs uppercase tracking-wider">Ver Servicios</a>
        </div>
      `;
      return;
    }

    container.innerHTML = myOrders.map(order => {
      const isAssigned = !!order.assignedBooster;
      const statusText = order.status === 'COMPLETED' ? 'COMPLETADO' : (isAssigned ? 'EN PROCESO' : 'BUSCANDO BOOSTER');
      const statusClass = order.status === 'COMPLETED' ? 'bg-[#152319] text-emerald-400 border border-emerald-800/40' : (isAssigned ? 'bg-[#2b1f15] text-[#fcefc2] border border-[#ee914f]/40' : 'bg-stone-900 text-stone-400 border border-stone-800');

      return `
        <div class="glass-panel p-5 rounded-2xl border border-stone-800 hover:border-[#ee914f]/50 transition-all mb-4">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-2 mb-1.5 flex-wrap">
                <span class="text-xs font-mono-gaming font-bold text-[#ee914f]">#${order.id}</span>
                <span class="px-2.5 py-0.5 text-[10px] rounded font-bold ${statusClass}">
                  ${statusText}
                </span>
                <span class="text-[11px] px-2 py-0.5 rounded bg-[#17120e] text-stone-300 border border-stone-800">
                  ${order.category}
                </span>
                <span class="text-[11px] px-2 py-0.5 rounded bg-[#17120e] text-stone-300 border border-stone-800">
                  ${order.completionMethod} (${order.region})
                </span>
              </div>

              <h4 class="text-base font-bold text-white">${order.serviceName}</h4>
              <p class="text-xs text-stone-400 mt-0.5">Personaje: <span class="text-stone-200 font-semibold">${order.characterName}</span> | Reino: ${order.realm}</p>
              
              ${isAssigned ? `
                <div class="mt-2.5 inline-flex items-center gap-2 bg-[#201812] px-3 py-1 rounded-xl border border-[#ee914f]/30 text-xs">
                  <i class="fa-solid fa-gamepad text-[#ee914f]"></i>
                  <span class="text-stone-300">Booster Asignado: <strong class="text-[#fcefc2]">${order.assignedBooster.username}</strong></span>
                  ${order.isOnAccount ? `<span class="ml-2 text-[10px] bg-red-950 text-red-300 px-2 py-0.5 rounded border border-red-800 font-semibold animate-pulse">En tu cuenta ahora</span>` : ''}
                </div>
              ` : `
                <div class="mt-2 text-xs text-stone-500">
                  <i class="fa-solid fa-hourglass-half mr-1"></i> Tu orden está en el tablón. Un booster la tomará en breve.
                </div>
              `}
            </div>

            <div class="flex items-center gap-3 border-t md:border-t-0 pt-3 md:pt-0 border-stone-800 justify-between md:justify-end">
              <div class="text-right">
                <span class="text-[10px] text-stone-500 block uppercase">Total Pagado</span>
                <span class="text-2xl font-bold font-mono-gaming text-[#fcefc2]">$${order.totalPrice.toFixed(2)}</span>
              </div>
              <button onclick="app.openClientFullChat('${order.id}')" class="px-4 py-2.5 rounded-xl bg-[#221a14] hover:bg-[#2d221a] text-[#fcefc2] border border-[#ee914f]/40 font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all">
                <i class="fa-solid fa-comments text-[#ee914f]"></i>
                <span>Chat con el Booster</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
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
    if (!this.currentUser) return false;
    // Staff & Admin always have access
    if (this.currentUser.type === 'staff' || this.currentUser.type === 'admin') return true;
    // Order's client has access
    if (order.clientId === this.currentUser.id || order.clientEmail === this.currentUser.email || order.clientName === this.currentUser.username) return true;
    // Order's assigned booster has access
    if (order.assignedBooster && (order.assignedBooster.discordId === this.currentUser.discordId || order.assignedBooster.username === this.currentUser.username)) return true;
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

    stream.innerHTML = (order.chat || []).map(msg => `
      <div class="flex flex-col ${msg.sender === 'client' ? 'items-end' : (msg.sender === 'system' ? 'items-center' : 'items-start')} mb-3">
        ${msg.sender === 'system' ? `
          <span class="text-[11px] bg-[#1a140f] border border-[#ee914f]/30 text-[#fcefc2] px-3.5 py-1 rounded-full text-center">
            ${msg.message}
          </span>
        ` : `
          <div class="max-w-[80%] p-3.5 rounded-2xl text-xs ${msg.sender === 'client' ? 'bg-[#291e16] text-[#fcefc2] border border-[#ee914f]/35 rounded-br-none' : 'bg-[#18130f] text-stone-200 border border-stone-800 rounded-bl-none'}">
            <div class="text-[10px] text-[#ee914f] mb-1 font-semibold">${msg.author}</div>
            <div class="leading-relaxed">${msg.message}</div>
          </div>
          <span class="text-[9px] text-stone-500 mt-1">${new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        `}
      </div>
    `).join('');

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

    const myOrders = this.orders.filter(o => 
      o.clientId === this.currentUser?.id || 
      o.clientEmail === this.currentUser?.email ||
      o.clientName === this.currentUser?.username
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
            ${(order.chat || []).map(msg => `
              <div class="flex flex-col ${msg.sender === 'client' ? 'items-end' : (msg.sender === 'system' ? 'items-center' : 'items-start')}">
                ${msg.sender === 'system' ? `
                  <div class="max-w-md p-2 rounded-xl text-center text-[10px] ${msg.message.includes('ha ingresado') ? 'bg-amber-950/60 border border-amber-800 text-amber-200' : (msg.message.includes('ha salido') ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-200' : 'bg-[#1b140f] border border-stone-800 text-stone-300')}">
                    ${msg.message}
                  </div>
                ` : `
                  <div class="max-w-[80%] p-3 rounded-2xl text-xs ${msg.sender === 'client' ? 'bg-[#2e2116] text-[#fcefc2] border border-[#ee914f]/35 rounded-br-none' : 'bg-[#18120d] text-stone-200 border border-stone-800 rounded-bl-none'}">
                    <div class="text-[10px] text-[#ee914f] mb-1 font-semibold flex items-center justify-between gap-4">
                      <span>${msg.author}</span>
                      <span class="text-[9px] text-stone-500 font-normal">${new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <div class="leading-relaxed">${msg.message}</div>
                  </div>
                `}
              </div>
            `).join('')}
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
            <span class="text-2xl font-black font-mono-gaming text-[#fcefc2]">$${order.totalPrice.toFixed(2)}</span>
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
      author: this.currentUser?.username || 'Cliente',
      message: msg,
      timestamp: new Date().toISOString()
    });

    this.saveOrders();
    input.value = '';
    this.openClientFullChat(order.id);
  }

// BOOSTER PRO PORTAL (WAR ROOM BOARD)
  // ==========================================
  initProPortal() {
    // STRICT ACCESS GUARD: Boosters and Admin/Staff only
    if (!this.isBooster() && !this.isAdminOrGerente()) {
      document.body.style.display = 'none';
      this.showToast('Acceso Denegado: Portal exclusivo para Boosters verificados.', 'error');
      setTimeout(() => {
        window.location.replace('index.html');
      }, 350);
      return;
    }

    this.renderProOrderFeed();
    this.renderProMyOrders();
    this.renderProWallet();
    this.renderChatList();
    this.renderBoosterUpsellCatalog();
    this.initBoosterProfileForm();
  }

  renderProOrderFeed() {
    const container = document.getElementById('pro-orders-feed');
    if (!container) return;

    const availableOrders = this.orders.filter(o => o.status === 'AVAILABLE' || o.status === 'BIDDING');
    
    const countBadge = document.getElementById('available-orders-count');
    if (countBadge) countBadge.textContent = `${availableOrders.length} disponibles`;

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

    container.innerHTML = availableOrders.map(order => `
      <div class="glass-panel rounded-2xl p-5 mb-4 border border-stone-800/80 hover:border-[#ee914f]/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group">
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-2 flex-wrap">
            <span class="px-2.5 py-0.5 text-[11px] font-bold rounded-md bg-[#251c14] text-[#ee914f] border border-[#ee914f]/30">
              ${order.category}
            </span>
            <span class="text-xs font-mono-gaming font-bold text-stone-400">
              #${order.id}
            </span>
            <span class="text-[11px] px-2 py-0.5 rounded bg-stone-900 text-stone-300 border border-stone-800">
              ${order.region}
            </span>
            <span class="text-[11px] px-2 py-0.5 rounded ${order.completionMethod === 'Piloted' ? 'bg-[#301c10] text-[#fccc8f] border border-[#b85d1d]/40' : 'bg-[#18231a] text-emerald-400 border border-emerald-900/40'}">
              ${order.completionMethod}
            </span>
            ${order.bids.length > 0 ? `<span class="text-[11px] px-2 py-0.5 rounded bg-[#2c1d14] text-[#fcefc2] border border-[#ee914f]/40"><i class="fa-solid fa-gavel mr-1"></i>${order.bids.length} Oferta(s)</span>` : ''}
          </div>

          <h3 class="text-base font-bold text-white group-hover:text-[#fcefc2] transition-colors">
            ${order.serviceName}
          </h3>
          <p class="text-xs text-stone-400 mt-1">
            ${order.details}
          </p>
          <div class="text-[11px] text-stone-500 mt-2 flex items-center gap-3">
            <span><i class="fa-solid fa-shield-halved text-[#ee914f] mr-1"></i>VPN: ${order.vpnLocation}</span>
            <span><i class="fa-solid fa-clock mr-1"></i>Hora: ${new Date(order.createdAt).toLocaleTimeString()}</span>
          </div>
        </div>

        <div class="flex items-center gap-4 border-t md:border-t-0 md:border-l border-stone-800 pt-3 md:pt-0 md:pl-6 justify-between md:justify-end">
          <div class="text-right">
            <span class="text-[10px] text-stone-400 block uppercase tracking-wider">Pago al Pro (${order.boosterPayoutRate || 30}%)</span>
            <div class="text-2xl font-bold font-mono-gaming text-[#fcefc2]">
              $${order.boosterPayout.toFixed(2)}
            </div>
            <span class="text-[10px] text-stone-500">Total cliente: $${order.totalPrice.toFixed(2)}</span>
          </div>

          <div class="flex flex-col gap-2 min-w-[135px]">
            <button onclick="app.takeOrder('${order.id}')" class="px-3.5 py-2 rounded-xl copper-gradient-bg font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-bolt"></i>
              <span>Tomar Orden</span>
            </button>
            <button onclick="app.openBidModal('${order.id}')" class="px-3.5 py-2 rounded-xl bg-[#1f1712] hover:bg-[#2c2018] text-[#eedaa2] border border-[#ee914f]/35 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-gavel"></i>
              <span>Hacer Oferta</span>
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  takeOrder(orderId) {
    if (!this.checkBoosterPermission()) return;

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
    this.showToast(`¡Orden #${order.id} tomada con éxito!`, 'success');
  }

  openBidModal(orderId) {
    if (!this.checkBoosterPermission()) return;

    const order = this.orders.find(o => o.id === orderId);
    if (!order) return;

    const modal = document.getElementById('bid-modal');
    const content = document.getElementById('bid-modal-content');
    if (!modal || !content) return;

    content.innerHTML = `
      <div class="p-6">
        <h3 class="text-lg font-bold text-[#fcefc2] mb-1 font-cinzel">Hacer Oferta (Subasta)</h3>
        <p class="text-xs text-stone-400 mb-4">Orden #${order.id} - ${order.serviceName}</p>

        <div class="bg-[#140e0b] p-4 rounded-xl border border-stone-800 space-y-2 mb-4 text-xs">
          <div class="flex justify-between">
            <span class="text-stone-400">Total pagado por cliente:</span>
            <span class="font-bold text-white">$${order.totalPrice.toFixed(2)}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-stone-400">Pago actual del Booster (30% base):</span>
            <span class="font-bold text-[#ee914f]">$${order.boosterPayout.toFixed(2)}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-stone-400">Oferta máxima permitida (50% límite):</span>
            <span class="font-bold text-[#fcefc2]">$${order.maxBidAllowed.toFixed(2)}</span>
          </div>
        </div>

        <div class="mb-4">
          <label class="block text-xs font-semibold text-stone-300 mb-1">Monto de tu oferta ($):</label>
          <input id="input-bid-amount" type="number" step="0.5" min="${order.boosterPayout}" max="${order.maxBidAllowed}" value="${(order.boosterPayout + 2).toFixed(2)}" class="w-full bg-[#17120e] border border-stone-700 rounded-xl px-4 py-2.5 text-base text-white focus:border-[#ee914f] outline-none">
          <p class="text-[11px] text-stone-500 mt-1">El monto puede estar entre $${order.boosterPayout.toFixed(2)} y $${order.maxBidAllowed.toFixed(2)}.</p>
        </div>

        <div class="flex justify-end gap-3">
          <button onclick="document.getElementById('bid-modal').classList.add('hidden')" class="px-4 py-2 rounded-xl bg-stone-900 text-stone-300 text-xs font-bold">Cancelar</button>
          <button onclick="app.submitBid('${order.id}')" class="px-5 py-2 rounded-xl copper-gradient-bg font-bold text-xs uppercase tracking-wider">Enviar Oferta</button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  submitBid(orderId) {
    const order = this.orders.find(o => o.id === orderId);
    if (!order) return;

    const amount = Number(document.getElementById('input-bid-amount')?.value);
    if (isNaN(amount) || amount > order.maxBidAllowed || amount < order.boosterPayout) {
      this.showToast(`La oferta debe estar entre $${order.boosterPayout.toFixed(2)} y el máximo de $${order.maxBidAllowed.toFixed(2)}`, 'error');
      return;
    }

    order.status = 'BIDDING';
    order.bids.push({
      boosterDiscordId: this.currentUser.discordId,
      boosterName: this.currentUser.username,
      bidAmount: amount,
      timestamp: new Date().toISOString()
    });

    this.saveOrders();
    document.getElementById('bid-modal').classList.add('hidden');
    this.renderProOrderFeed();
    this.showToast(`¡Oferta de $${amount.toFixed(2)} registrada!`, 'success');
  }

  renderProMyOrders() {
    const container = document.getElementById('pro-my-orders');
    if (!container) return;

    const myOrders = this.orders.filter(o => o.assignedBooster && o.assignedBooster.discordId === this.currentUser?.discordId);

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
            <h4 class="text-sm font-bold text-white">${order.serviceName}</h4>
            <p class="text-xs text-stone-400">Cliente: ${order.clientName} (${order.characterName})</p>
          </div>

          <div class="flex items-center gap-4 flex-wrap">
            <div class="flex items-center gap-2 bg-[#17110d] px-3 py-1.5 rounded-xl border border-stone-800">
              <span class="text-[11px] text-stone-300 font-semibold">Estoy en la cuenta:</span>
              <label class="switch">
                <input type="checkbox" ${order.isOnAccount ? 'checked' : ''} onchange="app.toggleOnAccount('${order.id}', this.checked)">
                <span class="slider"></span>
              </label>
            </div>

            <button onclick="app.openChat('${order.id}')" class="p-2.5 rounded-xl bg-[#201812] hover:bg-[#2b2118] text-[#fcefc2] border border-[#ee914f]/30 text-xs flex items-center gap-1.5">
              <i class="fa-solid fa-comments text-[#ee914f]"></i>
              <span>Chat</span>
            </button>

            ${order.status !== 'COMPLETED' ? `
              <button onclick="app.finishOrderModal('${order.id}')" class="px-4 py-2 rounded-xl copper-gradient-bg font-bold text-xs uppercase tracking-wider">
                <i class="fa-solid fa-check mr-1"></i> Finalizar Orden
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `).join('');
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

  finishOrderModal(orderId) {
    const order = this.orders.find(o => o.id === orderId);
    if (!order) return;

    if (confirm(`¿Confirmas que has completado la orden #${order.id}? Se acreditarán $${order.boosterPayout.toFixed(2)} a tu saldo.`)) {
      order.status = 'COMPLETED';
      order.completedAt = new Date().toISOString();
      order.isOnAccount = false;
      
      this.currentUser.balance = (this.currentUser.balance || 0) + order.boosterPayout;
      this.currentUser.points = (this.currentUser.points || 0) + 1;
      this.saveUser();

      const bIdx = this.boosters.findIndex(b => b.discord_id === this.currentUser.discordId);
      if (bIdx >= 0) {
        this.boosters[bIdx].balance = this.currentUser.balance;
        this.boosters[bIdx].points = this.currentUser.points;
        this.saveBoosters();
      }

      this.saveOrders();
      this.renderProMyOrders();
      this.renderProWallet();
      this.showToast(`¡Orden completada! Se añadieron $${order.boosterPayout.toFixed(2)} a tu balance.`, 'success');
    }
  }

  renderProWallet() {
    const bal = this.currentUser?.balance !== undefined ? Number(this.currentUser.balance) : 145.00;
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
      withdrawAmount.value = bal;
      withdrawAmount.max = bal;
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
    const link = `${window.location.origin}/index.html?service=${serviceId}&ref_booster=${encodeURIComponent(boosterName)}`;
    
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
    let b = (this.currentUser && (this.currentUser.type === 'booster' || this.isBooster() || this.currentUser.discordId === '443948776562884620' || (this.currentUser.username && this.currentUser.username.toLowerCase() === 'miguelb')))
      ? this.currentUser
      : (this.boosters && this.boosters.find(x => x.username.toLowerCase() === 'miguelb')) || { 
          username: 'Miguelb', 
          role: 'Master Booster', 
          points: 546,
          email: 'charquin50@gmail.com',
          payout_method: 'Binance Pay / USDT',
          wallet_id: '44394877',
          discord_id: '443948776562884620'
        };

    // If avatar missing, recover from backup or booster list
    if (!b.avatar) {
      const backup = localStorage.getItem('mp_discord_avatar_backup');
      const bMatch = this.boosters && this.boosters.find(x => x.discord_id === '443948776562884620' || (x.username && x.username.toLowerCase() === 'miguelb'));
      b.avatar = (bMatch && bMatch.avatar) || backup || '';
      if (b.avatar && this.currentUser) {
        this.currentUser.avatar = b.avatar;
        this.saveUser();
      }
    }

    // Populate inputs if form exists in DOM
    const nameInput = document.getElementById('pro-prof-name');
    if (nameInput) nameInput.value = b.username || 'Miguelb';

    const roleInput = document.getElementById('pro-prof-role');
    if (roleInput) roleInput.value = `${b.role || 'Booster'} (${b.points || 0} pts)`;

    const avatarInput = document.getElementById('pro-prof-avatar');
    if (avatarInput) avatarInput.value = b.avatar || '';

    const emailInput = document.getElementById('pro-prof-email');
    if (emailInput) emailInput.value = b.email || '';

    const payoutEmailInput = document.getElementById('pro-prof-payout-email');
    if (payoutEmailInput) payoutEmailInput.value = b.payoutEmail || b.payout_email || b.email || '';

    const payoutMethodSelect = document.getElementById('pro-prof-payout-method');
    if (payoutMethodSelect) {
      const pm = b.payoutMethod || b.payout_method || 'Binance Pay / USDT';
      payoutMethodSelect.value = pm;
      this.onBoosterPayoutMethodChange(pm);
    }

    const payoutAddressInput = document.getElementById('pro-prof-payout-address');
    if (payoutAddressInput) payoutAddressInput.value = b.payoutAddress || b.payout_address || b.wallet_id || '';

    const payoutCurrencySelect = document.getElementById('pro-prof-payout-currency');
    if (payoutCurrencySelect) payoutCurrencySelect.value = b.payoutCurrency || 'USD';

    const discordInput = document.getElementById('pro-prof-discord');
    if (discordInput) discordInput.value = b.discordId || b.discord_id || '';

    const battletagInput = document.getElementById('pro-prof-battletag');
    if (battletagInput) battletagInput.value = b.battletag || '';

    const regionSelect = document.getElementById('pro-prof-region');
    if (regionSelect) regionSelect.value = b.region || 'América (US) & Europa (EU)';

    const realmInput = document.getElementById('pro-prof-realm');
    if (realmInput) realmInput.value = b.realm || 'Ragnaros (US)';

    const factionSelect = document.getElementById('pro-prof-faction');
    if (factionSelect) factionSelect.value = b.faction || 'Ambas (Cross-Faction)';

    const rolesInput = document.getElementById('pro-prof-roles');
    if (rolesInput) rolesInput.value = b.mainRoles || 'Tanque / DPS Melee';

    const bioInput = document.getElementById('pro-prof-bio');
    if (bioInput) bioInput.value = b.bio || 'Booster profesional de WoW. M+ Pusher, Raid CE y soporte 24/7.';

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
    if (prevBalance) prevBalance.textContent = `$${(b.balance !== undefined ? Number(b.balance) : 145).toFixed(2)}`;

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
      this.currentUser = { type: 'booster' };
    }
    const oldUsername = this.currentUser.username || 'Miguelb';
    const wasAdmin = this.currentUser.type === 'admin' || this.currentUser.type === 'staff' || this.currentUser.isAdmin || this.isAdminOrGerente();
    this.currentUser.type = wasAdmin ? 'admin' : 'booster';
    this.currentUser.username = name;
    this.currentUser.avatar = avatar;
    this.currentUser.email = email;
    this.currentUser.payoutEmail = payoutEmail;
    this.currentUser.payout_email = payoutEmail;
    this.currentUser.payoutMethod = payoutMethod;
    this.currentUser.payout_method = payoutMethod;
    this.currentUser.payoutAddress = payoutAddress;
    this.currentUser.payoutCurrency = payoutCurrency;
    this.currentUser.discordId = discordId || this.currentUser.discordId;
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
    }

    if (avatar) {
      localStorage.setItem('mp_discord_avatar_backup', avatar);
    }

    this.saveUser();

    // Sync with this.boosters list in memory and localStorage
    if (this.boosters && this.boosters.length > 0) {
      const idx = this.boosters.findIndex(b => 
        (discordId && b.discord_id === discordId) || 
        b.username.toLowerCase() === oldUsername.toLowerCase() ||
        b.username.toLowerCase() === name.toLowerCase()
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
          role: wasAdmin ? 'Master Booster & Admin' : 'Booster',
          roles: wasAdmin ? ['Master Booster', 'Staff / Admin'] : ['Booster'],
          points: 546,
          approved: true,
          balance: 0.00,
          email: email,
          avatar: avatar,
          payout_email: payoutEmail,
          payout_method: payoutMethod,
          payout_address: payoutAddress,
          wallet_id: payoutAddress,
          discord_id: discordId || '443948776562884620',
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
    const isAdmin = this.currentUser?.type === 'admin' || this.currentUser?.type === 'staff';
    const myChatOrders = isAdmin 
      ? this.orders 
      : this.orders.filter(o => 
          o.assignedBooster && (o.assignedBooster.discordId === this.currentUser?.discordId || o.assignedBooster.id === this.currentUser?.id)
        );

    if (myChatOrders.length === 0) {
      listContainer.innerHTML = `<div class="p-4 text-xs text-stone-500">No hay chats activos registrados</div>`;
      return;
    }

    listContainer.innerHTML = myChatOrders.map(o => `
      <div onclick="app.openChat('${o.id}')" class="p-3.5 rounded-xl cursor-pointer transition-all ${this.activeChatOrderId === o.id ? 'bg-[#291e16] border border-[#ee914f]/50' : 'hover:bg-[#1a140f] border border-transparent'}">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-bold text-white">${o.clientName}</span>
          <span class="text-[10px] text-stone-400">#${o.id}</span>
        </div>
        <div class="flex items-center justify-between text-[10px] text-stone-500 mb-1">
          <span class="truncate max-w-[120px]">${o.serviceName || 'Servicio'}</span>
          <span class="text-[#ee914f]">${o.assignedBooster ? o.assignedBooster.username : 'Sin booster'}</span>
        </div>
        <p class="text-[11px] text-stone-400 truncate">${o.chat && o.chat.length ? o.chat[o.chat.length - 1].message : 'Abrir chat...'}</p>
      </div>
    `).join('');
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

    this.renderChatList();
    const chatContainer = document.getElementById('chat-active-window');
    if (!chatContainer) return;

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
            ${(order.chat || []).map(msg => `
              <div class="flex flex-col ${msg.sender === 'booster' ? 'items-end' : (msg.sender === 'system' ? 'items-center' : 'items-start')}">
                ${msg.sender === 'system' ? `
                  <span class="text-[10px] bg-[#1a140f] border border-stone-800 text-stone-400 px-3 py-1 rounded-full text-center">${msg.message}</span>
                ` : `
                  <div class="max-w-[75%] p-3 rounded-2xl text-xs ${msg.sender === 'booster' ? 'bg-[#2f2217] text-[#fcefc2] border border-[#ee914f]/30 rounded-br-none' : 'bg-[#1a1511] text-stone-200 border border-stone-800 rounded-bl-none'}">
                    <div class="text-[10px] text-[#ee914f] mb-1 font-semibold">${msg.author}</div>
                    <div>${msg.message}</div>
                  </div>
                  <span class="text-[9px] text-stone-500 mt-1">${new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                `}
              </div>
            `).join('')}
          </div>

          <form onsubmit="event.preventDefault(); app.sendChatMessage();" class="flex gap-2 pt-3 border-t border-stone-800">
            <input id="chat-input-text" type="text" placeholder="Escribe un mensaje al cliente sobre la orden..." class="flex-1 bg-[#17120e] border border-stone-700 rounded-xl px-4 py-2 text-xs text-white focus:border-[#ee914f] outline-none">
            <button type="submit" class="px-4 py-2 rounded-xl copper-gradient-bg font-bold text-xs">
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

    const isStaff = this.currentUser?.type === 'admin' || this.currentUser?.type === 'staff';

    order.chat = order.chat || [];
    order.chat.push({
      sender: isStaff ? 'admin' : 'booster',
      author: isStaff ? `${this.currentUser?.username || 'Staff'} (Soporte / Gerencia)` : `${this.currentUser?.username || 'Pro'} (Booster)`,
      message: input.value.trim(),
      timestamp: new Date().toISOString()
    });

    this.saveOrders();
    input.value = '';
    this.openChat(this.activeChatOrderId);
  }

  // ==========================================
  

  // ==========================================
  // ADMIN PORTAL (STAFF OVERVIEW, CLIENTS, ORDERS & PRODUCT CRUD)
  // ==========================================
  initAdminPortal() {
    // STRICT ACCESS GUARD: Staff & Admin Only
    if (!this.isAdminOrGerente()) {
      document.body.style.display = 'none';
      this.showToast('Acceso Denegado: Se requieren permisos de Administrador o Staff.', 'error');
      setTimeout(() => {
        window.location.replace('index.html');
      }, 350);
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

    // Sidebar navigation badges
    const badgeOrders = document.getElementById('badge-orders-count');
    if (badgeOrders) badgeOrders.textContent = this.orders.length;

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
      <tr class="hover:bg-[#1a140f] transition-colors text-xs text-stone-300 border-b border-stone-800/40">
        <td class="py-4 px-5 font-mono-gaming text-[#ee914f] font-bold whitespace-nowrap">${svc.id}</td>
        <td class="py-4 px-5 font-bold text-white flex items-center gap-3">
          <div class="w-8 h-8 rounded-xl bg-[#221a14] border border-[#ee914f]/30 flex items-center justify-center text-[#ee914f] shrink-0">
            <i class="fa-solid ${svc.icon || 'fa-dungeon'} text-xs"></i>
          </div>
          <div>
            <div class="text-white text-sm leading-snug">${svc.name}</div>
            <div class="text-[11px] text-stone-400 mt-0.5 truncate max-w-sm">${svc.description ? svc.description.slice(0, 75) + '...' : ''}</div>
          </div>
        </td>
        <td class="py-4 px-5 whitespace-nowrap">
          <span class="inline-flex items-center px-3 py-1 rounded-full bg-[#251b14] text-[#fcefc2] border border-[#ee914f]/30 text-[11px] font-semibold">
            ${svc.category}
          </span>
        </td>
        <td class="py-4 px-5 font-mono-gaming font-bold text-[#fcefc2] text-sm whitespace-nowrap">
          $${Number(svc.basePrice).toFixed(2)}
        </td>
        <td class="py-4 px-5 whitespace-nowrap">
          <span class="inline-flex items-center px-2.5 py-1 rounded-lg bg-stone-900 border border-stone-800 text-[10px] text-stone-300 font-semibold">
            ${svc.badge || 'Popular'}
          </span>
        </td>
        <td class="py-4 px-5 text-right whitespace-nowrap">
          <div class="flex items-center justify-end gap-2">
            <button onclick="app.editProductModal('${svc.id}')" class="px-3 py-1.5 rounded-xl bg-[#241a13] hover:bg-[#342419] text-[#fcefc2] border border-[#ee914f]/40 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all">
              <i class="fa-solid fa-pen-to-square text-[#ee914f]"></i>
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
          btn.className = 'px-3.5 py-1.5 rounded-xl bg-[#2a170d] text-[#ee914f] border border-[#ee914f]/50 flex items-center gap-2 transition-all cursor-pointer font-semibold shadow-sm';
        }
      } else {
        if (content) content.classList.add('hidden');
        if (btn) {
          btn.className = 'px-3.5 py-1.5 rounded-xl bg-[#17110d] hover:bg-[#201610] text-stone-400 hover:text-white border border-stone-800 flex items-center gap-2 transition-all cursor-pointer font-semibold';
        }
      }
    });
  }

  addModalKeyLevelRow(level = '', price = '', recommended = false) {
    const container = document.getElementById('adm-key-levels-list');
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'grid grid-cols-12 gap-2 items-center bg-[#140e0a] p-2 rounded-xl border border-stone-800/80 adm-key-row';
    row.innerHTML = `
      <div class="col-span-3">
        <input type="text" value="${level}" placeholder="+10" class="w-full bg-[#1c140e] border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-white text-center font-mono-gaming font-bold outline-none focus:border-[#ee914f] adm-key-lvl">
      </div>
      <div class="col-span-4">
        <input type="number" step="0.5" value="${price}" placeholder="38.00" class="w-full bg-[#1c140e] border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-[#fcefc2] font-mono-gaming font-bold outline-none focus:border-[#ee914f] adm-key-prc">
      </div>
      <div class="col-span-3 flex justify-center">
        <input type="radio" name="adm_key_recommended" ${recommended ? 'checked' : ''} class="w-4 h-4 accent-[#ee914f] cursor-pointer adm-key-rec" title="Marcar como recomendado">
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
    row.className = 'grid grid-cols-12 gap-2 items-center bg-[#140e0a] p-2 rounded-xl border border-stone-800 adm-trader-row';
    row.innerHTML = `
      <div class="col-span-7">
        <input type="text" value="${label}" placeholder="VIP Group (+3 traders)" class="w-full bg-[#1c140e] border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#ee914f] adm-trader-lbl">
      </div>
      <div class="col-span-3">
        <input type="number" step="0.01" value="${price}" placeholder="2.50" class="w-full bg-[#1c140e] border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-[#fcefc2] font-mono-gaming font-bold outline-none focus:border-[#ee914f] adm-trader-prc">
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
    row.className = 'grid grid-cols-12 gap-2 items-center bg-[#140e0a] p-2 rounded-xl border border-stone-800 adm-mode-row';
    row.innerHTML = `
      <div class="col-span-5">
        <input type="text" value="${label}" placeholder="Self-play" class="w-full bg-[#1c140e] border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#ee914f] adm-mode-lbl">
      </div>
      <div class="col-span-3">
        <input type="number" step="0.01" value="${price}" placeholder="0.00" class="w-full bg-[#1c140e] border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-[#fcefc2] font-mono-gaming font-bold outline-none focus:border-[#ee914f] adm-mode-prc">
      </div>
      <div class="col-span-2">
        <input type="text" value="${tag}" placeholder="Gratis" class="w-full bg-[#1c140e] border border-stone-700 rounded-lg px-2 py-1.5 text-xs text-stone-300 outline-none focus:border-[#ee914f] adm-mode-tag">
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
    row.className = 'grid grid-cols-12 gap-2 items-center bg-[#140e0a] p-2 rounded-xl border border-stone-800 adm-extra-row';
    row.innerHTML = `
      <div class="col-span-7">
        <input type="text" value="${label}" placeholder="Rank One Team" class="w-full bg-[#1c140e] border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#ee914f] adm-extra-lbl">
      </div>
      <div class="col-span-3">
        <input type="number" step="0.01" value="${price}" placeholder="1.95" class="w-full bg-[#1c140e] border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-[#fcefc2] font-mono-gaming font-bold outline-none focus:border-[#ee914f] adm-extra-prc">
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
        page: 'product.html?id=' + cleanSlug,
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

    container.innerHTML = list.map(o => `
      <tr class="hover:bg-[#1a140f] transition-colors text-xs text-stone-300 border-b border-stone-800/40">
        <td class="py-4 px-5 font-mono-gaming text-[#ee914f] font-bold whitespace-nowrap text-xs">#${o.id}</td>
        <td class="py-4 px-5">
          <div class="font-bold text-white text-sm leading-snug">${o.serviceName}</div>
          <div class="text-[11px] text-stone-400 mt-1">${o.details || (o.region + ' | ' + o.completionMethod)}</div>
        </td>
        <td class="py-4 px-5">
          <div class="font-semibold text-[#fcefc2] text-xs">${o.clientName || 'Cliente'}</div>
          <div class="text-[11px] text-stone-400 font-mono-gaming mt-0.5">${o.clientDiscord || o.clientId || 'N/A'}</div>
        </td>
        <td class="py-4 px-5 font-mono-gaming font-bold text-white text-sm whitespace-nowrap">
          $${Number(o.totalPrice).toFixed(2)}
        </td>
        <td class="py-4 px-5 font-mono-gaming text-[#fcefc2] font-bold text-sm whitespace-nowrap">
          $${(Number(o.companyShare) || (Number(o.totalPrice) * 0.70)).toFixed(2)}
        </td>
        <td class="py-4 px-5">
          ${o.assignedBooster ? `
            <div class="font-semibold text-emerald-300 flex items-center gap-1.5 text-xs">
              <i class="fa-solid fa-bolt text-[11px] text-[#ee914f]"></i>
              <span>${o.assignedBooster.username || 'Booster'}</span>
            </div>
            <div class="text-[10px] font-mono-gaming text-[#ee914f] mt-0.5">Pago: $${(Number(o.assignedBooster.payout) || Number(o.boosterPayout)).toFixed(2)} (${o.boosterPayoutRate || 30}%)</div>
          ` : `
            <span class="text-stone-500 italic text-[11px]">Sin asignar</span>
          `}
        </td>
        <td class="py-4 px-5 text-center whitespace-nowrap">
          <span class="inline-flex items-center justify-center whitespace-nowrap px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider ${
            o.status === 'COMPLETED' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 shadow-sm' :
            o.status === 'IN_PROGRESS' ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60 shadow-sm' :
            'bg-[#281b13] text-[#ee914f] border border-[#ee914f]/40 shadow-sm'
          }">
            ${o.status === 'COMPLETED' ? 'COMPLETADA' : o.status === 'IN_PROGRESS' ? 'EN PROCESO' : 'DISPONIBLE'}
          </span>
        </td>
        <td class="py-4 px-5 text-right whitespace-nowrap">
          <div class="flex items-center justify-end gap-2">
            <button onclick="app.openAdminOrderModal('${o.id}')" class="px-3 py-1.5 rounded-xl bg-[#241a13] hover:bg-[#342419] text-[#fcefc2] border border-[#ee914f]/40 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all" title="Ver Detalles y Chat">
              <i class="fa-solid fa-eye text-[#ee914f] text-xs"></i>
              <span>Auditar</span>
            </button>
            ${o.status !== 'COMPLETED' ? `
              <button onclick="app.adminCompleteOrder('${o.id}')" class="w-8 h-8 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800 flex items-center justify-center font-bold text-xs shadow-sm transition-all" title="Completar Orden">
                <i class="fa-solid fa-check"></i>
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `).join('');
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

  adminCompleteOrder(orderId) {
    const o = this.orders.find(x => x.id === orderId);
    if (!o) return;
    if (confirm(`¿Marcar la orden #${orderId} como COMPLETADA administrativamente?`)) {
      o.status = 'COMPLETED';
      o.completedAt = new Date().toISOString();
      o.isOnAccount = false;
      this.saveOrders();
      this.renderAdminOverview();
      this.renderAdminOrders(this.currentAdminOrderStatusFilter || 'ALL');
      this.showToast(`Orden #${orderId} marcada como completada.`, 'success');
    }
  }

  openAdminOrderModal(orderId) {
    const o = this.orders.find(x => x.id === orderId);
    if (!o) return;

    const modal = document.getElementById('admin-order-modal');
    const content = document.getElementById('admin-order-modal-content');
    if (!modal || !content) return;

    content.innerHTML = `
      <div class="flex items-center justify-between pb-4 border-b border-stone-800 mb-4">
        <div>
          <h3 class="text-base font-bold text-[#fcefc2] font-cinzel">Auditoría de Orden #${o.id}</h3>
          <span class="text-xs text-[#ee914f]">${o.serviceName}</span>
        </div>
        <button onclick="document.getElementById('admin-order-modal').classList.add('hidden')" class="w-8 h-8 rounded-full bg-stone-900 text-stone-400 hover:text-white flex items-center justify-center">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="space-y-4 text-xs">
        <div class="grid grid-cols-2 gap-3 bg-[#150f0c] p-4 rounded-xl border border-stone-800">
          <div><span class="text-stone-500">Cliente:</span> <strong class="text-white">${o.clientName}</strong> (${o.clientDiscord})</div>
          <div><span class="text-stone-500">Booster:</span> <strong class="text-[#ee914f]">${o.assignedBooster ? o.assignedBooster.username : 'Sin Asignar'}</strong></div>
          <div><span class="text-stone-500">Personaje:</span> <strong class="text-stone-200">${o.characterName || 'N/A'} (${o.realm || 'US'})</strong></div>
          <div><span class="text-stone-500">Modalidad:</span> <strong class="text-stone-200">${o.completionMethod || 'Self-play'}</strong></div>
          <div><span class="text-stone-500">Total Pagado:</span> <strong class="text-white font-mono-gaming text-sm">$${o.totalPrice.toFixed(2)}</strong></div>
          <div><span class="text-stone-500">Reparto (70/30):</span> <strong class="text-[#fcefc2] font-mono-gaming">$${(o.companyShare || o.totalPrice * 0.7).toFixed(2)} / $${(o.boosterPayout || o.totalPrice * 0.3).toFixed(2)}</strong></div>
        </div>

        <div>
          <h4 class="font-bold text-stone-300 mb-2 flex items-center gap-2">
            <i class="fa-solid fa-comments text-[#ee914f]"></i>
            <span>Historial del Chat Entre Cliente y Booster:</span>
          </h4>
          <div class="bg-[#120d09] border border-stone-800 rounded-xl p-3 max-h-56 overflow-y-auto space-y-2">
            ${o.chat && o.chat.length ? o.chat.map(m => `
              <div class="p-2 rounded-lg bg-[#1a130e] border border-stone-800/80">
                <div class="flex items-center justify-between text-[10px] text-stone-400 mb-0.5">
                  <span class="font-bold ${m.sender === 'booster' ? 'text-[#ee914f]' : m.sender === 'client' ? 'text-[#fcefc2]' : 'text-emerald-400'}">${m.author}</span>
                  <span>${new Date(m.timestamp).toLocaleTimeString()}</span>
                </div>
                <div class="text-stone-200 text-xs">${m.message}</div>
              </div>
            `).join('') : '<div class="text-stone-500 text-center py-4">No hay mensajes en este chat aún.</div>'}
          </div>
        </div>

        <div class="pt-4 border-t border-stone-800 flex justify-end gap-2">
          <button onclick="document.getElementById('admin-order-modal').classList.add('hidden')" class="px-4 py-2 rounded-xl bg-stone-900 text-stone-300 font-bold text-xs">Cerrar</button>
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
      'Miguel': 'bg-[#291e16] text-[#ee914f] border-[#ee914f]/30'
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
              <i class="fa-solid fa-calendar-day text-[9px] text-[#ee914f]"></i>
              <span>${o.fecha || 'N/A'}</span>
            </div>
          </td>
          <td class="py-3 px-4">
            <span class="px-2.5 py-1 rounded-full text-[10px] font-bold border ${carteraClass} inline-block">
              ${o.cartera}
            </span>
          </td>
          <td class="py-3 px-4 max-w-xs">
            <div class="font-bold text-[#fcefc2] truncate flex items-center gap-1.5">
              <i class="fa-solid fa-dungeon text-[#ee914f] text-[10px]"></i>
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
            ${o.cu > 0 ? `<div class="text-[#fcefc2] font-semibold">C/U: ${isGold ? o.cu.toLocaleString() : '$' + o.cu.toFixed(2)}</div>` : ''}
            ${o.total_pagar > 0 ? `<div class="text-[#ee914f] text-[10px]">Total: ${isGold ? o.total_pagar.toLocaleString() : '$' + o.total_pagar.toFixed(2)}</div>` : '<span class="text-stone-600">-</span>'}
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
            <button onclick="app.viewHistoryOrderModal('${encodeURIComponent(o.id)}')" class="px-2.5 py-1.5 rounded-lg bg-[#241a13] hover:bg-[#342419] text-[#fcefc2] border border-[#ee914f]/40 font-bold text-[11px] flex items-center gap-1.5 ml-auto shadow-sm" title="Ver todos los detalles">
              <i class="fa-solid fa-file-invoice text-[#ee914f]"></i>
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
          <div class="w-10 h-10 rounded-xl bg-[#241a13] border border-[#ee914f]/50 flex items-center justify-center text-[#ee914f] text-lg">
            <i class="fa-solid fa-file-invoice"></i>
          </div>
          <div>
            <h3 class="text-base font-bold text-[#fcefc2] font-cinzel leading-tight">Ficha de Orden: ${o.id}</h3>
            <span class="text-xs text-[#ee914f] font-semibold">${o.cartera} | Fecha: ${o.fecha || 'N/A'}</span>
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
            <div class="p-2.5 rounded-lg bg-[#1c140e] border border-stone-800/80">
              <span class="text-[10px] text-stone-500 block">Monto Real Total:</span>
              <strong class="text-sm font-mono-gaming ${isGold ? 'text-amber-400' : 'text-white'}">
                ${isGold ? o.monto_real.toLocaleString() + ' Gold' : '$' + o.monto_real.toFixed(2)}
              </strong>
            </div>
            <div class="p-2.5 rounded-lg bg-[#1c140e] border border-stone-800/80">
              <span class="text-[10px] text-stone-500 block">Pago C/U por Booster:</span>
              <strong class="text-sm font-mono-gaming text-[#fcefc2]">
                ${isGold ? o.cu.toLocaleString() + ' Gold' : '$' + o.cu.toFixed(2)}
              </strong>
            </div>
            <div class="p-2.5 rounded-lg bg-[#1c140e] border border-stone-800/80">
              <span class="text-[10px] text-stone-500 block">Total a Pagar:</span>
              <strong class="text-sm font-mono-gaming text-[#ee914f]">
                ${isGold ? o.total_pagar.toLocaleString() + ' Gold' : '$' + o.total_pagar.toFixed(2)}
              </strong>
            </div>
            ${o.mp_margin > 0 ? `
              <div class="p-2.5 rounded-lg bg-[#1c140e] border border-stone-800/80">
                <span class="text-[10px] text-stone-500 block">Margen Mythic (MP):</span>
                <strong class="text-xs font-mono-gaming text-emerald-400">$${o.mp_margin.toFixed(2)}</strong>
              </div>
            ` : ''}
            ${o.monto_booster_40 > 0 ? `
              <div class="p-2.5 rounded-lg bg-[#1c140e] border border-stone-800/80">
                <span class="text-[10px] text-stone-500 block">Monto Booster (40%):</span>
                <strong class="text-xs font-mono-gaming text-stone-300">$${o.monto_booster_40.toFixed(2)}</strong>
              </div>
            ` : ''}
            ${o.monto_booster_20 > 0 ? `
              <div class="p-2.5 rounded-lg bg-[#1c140e] border border-stone-800/80">
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
            <div class="p-2 rounded-lg bg-[#18110b] border border-stone-800 text-center">
              <span class="text-[10px] text-blue-400 font-bold block"><i class="fa-solid fa-shield mr-1"></i>Tank</span>
              <strong class="text-white text-xs">${o.tank || 'Sin asignar'}</strong>
            </div>
            <div class="p-2 rounded-lg bg-[#18110b] border border-stone-800 text-center">
              <span class="text-[10px] text-emerald-400 font-bold block"><i class="fa-solid fa-heart mr-1"></i>Healer</span>
              <strong class="text-white text-xs">${o.heal || 'Sin asignar'}</strong>
            </div>
            <div class="p-2 rounded-lg bg-[#18110b] border border-stone-800 text-center">
              <span class="text-[10px] text-amber-400 font-bold block"><i class="fa-solid fa-crosshairs mr-1"></i>DPS 1</span>
              <strong class="text-white text-xs">${o.dps1 || 'Sin asignar'}</strong>
            </div>
            <div class="p-2 rounded-lg bg-[#18110b] border border-stone-800 text-center">
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
      <tr class="hover:bg-[#1a140f] transition-colors text-xs text-stone-300 border-b border-stone-800/40">
        <td class="py-4 px-5 font-bold text-white flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-[#241a13] border border-[#ee914f]/40 flex items-center justify-center text-[#fcefc2] font-bold text-xs shrink-0">
            ${c.username ? c.username[0].toUpperCase() : 'C'}
          </div>
          <div>
            <div class="text-white text-sm leading-snug">${c.username}</div>
            <div class="text-[11px] text-stone-500 font-mono-gaming">${c.id}</div>
          </div>
        </td>
        <td class="py-4 px-5 font-mono-gaming text-[#ee914f] font-semibold whitespace-nowrap">${c.discordId}</td>
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
          <button onclick="app.viewClientDetailsModal('${c.id}')" class="px-3 py-1.5 rounded-xl bg-[#241a13] hover:bg-[#342419] text-[#fcefc2] border border-[#ee914f]/40 font-bold text-xs flex items-center gap-1.5 ml-auto shadow-sm transition-all">
            <i class="fa-solid fa-receipt text-[#ee914f]"></i>
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
          <h3 class="text-base font-bold text-[#fcefc2] font-cinzel">Perfil del Cliente: ${c.username}</h3>
          <span class="text-xs text-[#ee914f]">${c.discordId} | ${c.country}</span>
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
                <div class="text-right font-mono-gaming font-bold text-[#fcefc2]">
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
        <tr class="hover:bg-[#1f1712] transition-colors text-xs text-stone-300 border-b border-stone-800/40">
          <td class="py-4 px-5 font-mono-gaming text-stone-400 whitespace-nowrap">
            <span class="flex items-center gap-1.5">
              <i class="fa-brands fa-discord text-[#5865F2] text-xs"></i>
              <span>${b.discord_id}</span>
            </span>
          </td>
          <td class="py-4 px-5 font-bold text-white flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-full bg-[#2a1e16] border border-[#ee914f]/30 flex items-center justify-center text-xs text-[#fcefc2] shrink-0 font-bold overflow-hidden shadow-inner">
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
          <td class="py-4 px-5 font-mono-gaming text-[#fcefc2] font-bold whitespace-nowrap">${b.points || 0} pts</td>
          <td class="py-4 px-5 text-stone-400 text-xs whitespace-nowrap">
            <span class="px-2 py-1 rounded bg-[#16100b] border border-stone-800 text-[11px] text-stone-300">
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
                <button onclick="app.approveBooster('${b.discord_id}')" class="px-3 py-1.5 rounded-xl copper-gradient-bg font-bold text-xs uppercase shadow-sm">
                  Aprobar
                </button>
              ` : ''}
              <button onclick="app.openEditBoosterRolesModal('${b.discord_id}')" class="px-3 py-1.5 rounded-xl bg-[#241a12] hover:bg-[#342418] border border-[#ee914f]/30 hover:border-[#ee914f] text-[#fcefc2] font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm" title="Editar Multi-Roles">
                <i class="fa-solid fa-tags text-[11px] text-[#ee914f]"></i>
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
          <label class="flex items-start gap-3 p-2.5 rounded-xl bg-[#19120c] hover:bg-[#251a11] border border-stone-800 transition-colors cursor-pointer select-none">
            <input type="checkbox" name="booster_roles" value="${roleObj.id}" ${checked ? 'checked' : ''} class="mt-1 accent-[#ee914f] w-4 h-4 rounded">
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

    booster.roles = selectedRoles;
    booster.role = selectedRoles.join(' & ');

    // If editing the currently logged in user, synchronize session
    if (this.currentUser && this.currentUser.discordId === booster.discord_id) {
      this.currentUser.roles = selectedRoles;
      this.currentUser.role = booster.role;
      const hasStaff = selectedRoles.some(r => /admin|staff|gerente/i.test(r));
      this.currentUser.isAdmin = hasStaff;
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
        return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#3a1d0d] text-[#ee914f] border border-[#ee914f]/50 shadow-[0_0_8px_rgba(238,145,79,0.3)]"><i class="fa-solid fa-crown text-[9px] text-[#ee914f]"></i> ${r}</span>`;
      }
      if (rLower.includes('admin') || rLower.includes('staff') || rLower.includes('gerente')) {
        return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/70 text-rose-300 border border-rose-700/50 shadow-[0_0_8px_rgba(244,63,94,0.2)]"><i class="fa-solid fa-shield-halved text-[9px] text-rose-400"></i> ${r}</span>`;
      }
      if (rLower.includes('elite')) {
        return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-950/60 text-purple-300 border border-purple-700/50"><i class="fa-solid fa-star text-[9px] text-purple-400"></i> ${r}</span>`;
      }
      if (rLower.includes('veteran')) {
        return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950/60 text-cyan-300 border border-cyan-700/50"><i class="fa-solid fa-medal text-[9px] text-cyan-400"></i> ${r}</span>`;
      }
      if (rLower.includes('gold')) {
        return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/60 text-[#fcefc2] border border-amber-600/50"><i class="fa-solid fa-coins text-[9px] text-amber-400"></i> ${r}</span>`;
      }
      if (rLower.includes('raider')) {
        return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-950/60 text-blue-300 border border-blue-700/50"><i class="fa-solid fa-shield text-[9px] text-blue-400"></i> ${r}</span>`;
      }
      if (rLower.includes('supplier')) {
        return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-700/50"><i class="fa-solid fa-box text-[9px] text-emerald-400"></i> ${r}</span>`;
      }
      return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#1e1711] text-stone-300 border border-stone-700/50"><i class="fa-solid fa-bolt text-[9px] text-[#ee914f]"></i> ${r}</span>`;
    }).join('');
  }

  isAdminOrGerente() {
    if (!this.currentUser) return false;
    if (this.currentUser.isAdmin === true) return true;
    if (this.currentUser.type === 'admin' || this.currentUser.type === 'staff') return true;
    if (this.currentUser.discordId === '443948776562884620') return true;
    if (Array.isArray(this.currentUser.roles)) {
      if (this.currentUser.roles.some(r => /admin|staff|gerente/i.test(r))) return true;
    }
    const role = (this.currentUser.role || '').toLowerCase();
    const username = (this.currentUser.username || '').toLowerCase();
    return role.includes('admin') || role.includes('gerente') || role.includes('staff') || username === 'miguelb' || username.includes('admin') || username.includes('gerente');
  }

  isBooster() {
    if (!this.currentUser) return false;
    if (this.currentUser.isBooster === true) return true;
    if (this.currentUser.type === 'booster') return true;
    if (this.currentUser.discordId === '443948776562884620') return true;
    if (Array.isArray(this.currentUser.roles)) {
      if (this.currentUser.roles.some(r => /booster|raider|supplier|master/i.test(r))) return true;
    }
    const role = (this.currentUser.role || '').toLowerCase();
    return role.includes('booster') || role.includes('raider') || role.includes('supplier') || role.includes('master');
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

  // ==========================================
  // HEADER & ROLES (STRICT ACCESS CONTROL)
  // ==========================================
  renderHeader() {
    const userBadge = document.getElementById('user-session-badge');
    if (!userBadge) return;

    if (!this.currentUser) {
      userBadge.innerHTML = `
        <button onclick="app.openAuthModal()" class="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-[#5865F2]/25 hover:shadow-[#5865F2]/45 border border-[#5865F2]/40 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer group">
          <i class="fa-brands fa-discord text-base group-hover:scale-110 transition-transform"></i>
          <span class="tracking-wide font-sans">Iniciar con Discord</span>
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
          <a href="admin.html" id="header-admin-btn" class="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#2a170d] hover:bg-[#3d1f11] text-[#fcefc2] hover:text-white border border-[#ee914f] text-xs font-bold shadow-[0_0_15px_rgba(238,145,79,0.35)] transition-all">
            <i class="fa-solid fa-shield-halved text-[#ee914f]"></i>
            <span>Panel Admin</span>
          </a>
          <a href="pro.html" title="Ir al Tablón de Boosters" class="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#18110b] hover:bg-[#251a11] text-stone-300 hover:text-white border border-stone-800 text-xs font-semibold transition-all">
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
          <a href="pro.html" class="flex items-center gap-2 text-left hover:opacity-90 transition-opacity">
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
          <a href="client-profile.html" class="flex items-center gap-2 text-left hover:opacity-80 transition-opacity">
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
    if (path.includes('client-profile.html') || path.includes('pro.html') || path.includes('admin.html')) {
      setTimeout(() => {
        window.location.href = 'index.html';
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
    const boosterRate = isUpsell ? BOOSTER_UPSELL_PERCENT : BOOSTER_DEFAULT_PERCENT;
    const companyRate = 100 - boosterRate;

    const company = Number((totalPrice * (companyRate / 100)).toFixed(2));
    const booster = Number((totalPrice * (boosterRate / 100)).toFixed(2));
    const maxBid = Number((totalPrice * (BOOSTER_MAX_BID_PERCENT / 100)).toFixed(2));
    return { company, booster, maxBid, boosterRate };
  }
}

const app = new MythicApp();
window.app = app;
window.openAuthModal = () => app.openAuthModal();
window.closeAuthModal = () => app.closeAuthModal();
window.handleDiscordLogin = () => app.handleDiscordLogin();
window.logout = () => app.logout();


