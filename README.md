# MythicProgression.com 🐉

Plataforma profesional de venta de servicios de **World of Warcraft** (Míticas+, Bandas, Powerleveling, PvP y Oro) con bolsa de trabajo para boosters inspirada en el modelo de **Skycoach.gg**.

---

## 🏛️ Estructura del Proyecto

```text
D:\Mythicprogression.com\
├── assets/
│   ├── css/
│   │   └── styles.css          # Estilos gaming oscuros, badges y componentes Skycoach
│   ├── img/
│   │   ├── logo.png            # Logo circular de Mythic Progression
│   │   ├── logo_circular.png   # Logo circular MP en alta resolución
│   │   └── logo_horizontal.png # Banner horizontal
│   └── js/
│       └── app.js              # Lógica central: tienda, bolsa de pedidos, chat, economía 70/30
├── data/
│   ├── seed_boosters.json      # 116 Boosters importados de mythic.db (Pre-aprobados)
│   ├── seed_orders.json        # Órdenes de prueba con estados (Available, Bidding, In Progress)
│   └── seed_services.json      # Catálogo de servicios de World of Warcraft
├── index.html                  # Tienda para Clientes (Catálogo interactivo + Carrito)
├── pro.html                    # Portal de Boosters (/pro/find, My Orders, Multi Chat, Billetera)
├── admin.html                  # Panel de Staff & Gerencia (Supervisión 70/30 y Aprobaciones)
├── start_web.bat               # Lanzador rápido para abrir en tu navegador
└── README.md                   # Esta documentación
```

---

## 💰 Modelo Económico Implementado

* **70% Empresa:** Retención automática de la plataforma en cada pedido.
* **30% Booster Base:** Pago mínimo que recibe el booster al tomar la orden de inmediato con el botón **`Tomar Orden`**.
* **Subasta (Bid) hasta 50%:** Los boosters pueden usar el botón **`Hacer Oferta`** para pujar hasta un límite máximo del **50% del valor total de la orden**.

---

## 🎮 Flujo Operativo (Modelo Skycoach)

1. **Cliente Compra (`index.html`):**
   * Configura su servicio en vivo (nivel de piedra +2 a +15, reino, personaje, modo Piloted o Self-Play, traders).
   * Al pagar, se genera un **Order ID** único (ej. `MP-91024`).
   * La orden pasa inmediatamente a la bolsa de trabajo de los boosters.

2. **Booster Toma la Orden (`pro.html` - Find Orders):**
   * El booster ve la ganancia neta (30%), detalles, VPN requerida y facción.
   * Opciones: **`Tomar Orden`** (de inmediato) o **`Hacer Oferta`** (bid).

3. **Ejecución y Seguridad (`pro.html` - My Orders & Multi Chat):**
   * **Interruptor "Estoy en la cuenta":** Notifica automáticamente al cliente para evitar desconexiones accidentales.
   * **Multi Chat:** Chat 1 a 1 entre el cliente y el booster asignado, con banner estricto anti-fraude y advertencias de no comerciar por fuera.
   * **Finalizar Orden:** El booster marca la orden completada y el saldo se abona a su billetera.

4. **Registro y Aprobación de Boosters:**
   * Los **116 boosters** ya existentes en tu bot están **pre-aprobados** automáticamente al iniciar sesión con su Discord.
   * Los nuevos postulantes completan su perfil (Correo, Contraseña, Nombre, País y Método de pago) y quedan en cola de revisión en el panel de administración (`admin.html`).

---

## 🚀 Cómo Probarlo en Local

Simplemente haz doble clic en el archivo:
`start_web.bat`
Se abrirá automáticamente en tu navegador en `http://localhost:8080`.

---

## 🌐 Alojamiento Gratuito (Opciones Recomendadas)

1. **GitHub Pages (100% Gratis):**
   * Puedes subir esta carpeta a un repositorio en GitHub y activar **GitHub Pages** en la pestaña *Settings -> Pages*.
   * Estará en línea gratis y con certificado SSL. Puedes vincular tu dominio `Mythicprogression.com` directamente en la configuración de GitHub Pages.
2. **Alwaysdata:**
   * Como ya tienes tu cuenta `mythicprogression` en Alwaysdata, también puedes alojar la web allí en una carpeta `/home/mythicprogression/www`.
