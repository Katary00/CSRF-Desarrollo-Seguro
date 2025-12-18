# Demo CSRF en Node.js — Guía Completa y Detallada

> **Demo educativo local** de Cross-Site Request Forgery (CSRF) con explicaciones paso a paso para entender y explicar el ataque en clase.

---

## 📚 Índice

1. [¿Qué es CSRF?](#qué-es-csrf)
2. [Estructura del proyecto](#estructura-del-proyecto)
3. [Las 3 Defensas](#las-3-defensas)
4. [Instalación y configuración](#instalación-y-configuración)
5. [Cómo funciona el ataque CSRF (teoría)](#cómo-funciona-el-ataque-csrf)
6. [✅ Cómo verificar cada defensa](#cómo-verificar-cada-defensa)
7. [Análisis del código vulnerable](#análisis-del-código-vulnerable)
8. [Demostración paso a paso](#demostración-paso-a-paso)
9. [Ejercicios prácticos](#ejercicios-prácticos)
10. [Preguntas frecuentes](#preguntas-frecuentes)

---

## 🎯 ¿Qué es CSRF?

**CSRF** (Cross-Site Request Forgery) es un ataque que **fuerza al navegador de un usuario autenticado a ejecutar acciones no deseadas** en una aplicación web en la que confía.

### Ejemplo del mundo real:

1. **Estás conectado a tu banco online** (`banco.com`)
2. **Abres otra pestaña** y visitas un sitio malicioso (`sitio-malicioso.com`)
3. **Ese sitio contiene código oculto** que envía una petición a tu banco
4. **Tu navegador envía la cookie de sesión automáticamente** (porque está autenticado)
5. **El banco procesa la transferencia** sin validar que fue tu solicitud

**Resultado:** Dinero transferido sin tu consentimiento.

**¿Por qué funciona?**

- Los navegadores envían cookies automáticamente en peticiones al mismo dominio
- El servidor no puede distinguir si la petición vino de tu formulario legítimo o de un sitio malicioso
- Las defensas adicionales (tokens, SameSite, verificación de headers) lo impiden

**Conceptos clave:**

- **Cambiar estado = modificar datos persistentes** (transferencia, cambio de contraseña, eliminación de cuenta)
- **Leer datos no es CSRF** (descargas, búsquedas) porque el navegador no expone la respuesta
- **GET cambia estado = vulnerable** (aunque es mala práctica)
- **POST requiere validación = defensa**

---

## 📁 Estructura del proyecto

```
csrf-node-demo/
├── package.json
├── README.md
├── vulnerable/               # 🔴 Puerto 3000 - Banco SIN protecciones
├── attacker/                 # 💀 Puerto 3001 - Sitio malicioso
├── fixed/
│   ├── defense-1-token/      # 🔐 Puerto 3010 - Tokens Anti-CSRF
│   ├── defense-2-samesite/
│   │   ├── strict/           # 🔒 Puerto 3020 - SameSite=Strict
│   │   ├── lax/              # ⚖️ Puerto 3021 - SameSite=Lax ⭐
│   │   └── none/             # ⚠️ Puerto 3022 - SameSite=None (HTTPS)
│   └── defense-3-headers/    # 📧 Puerto 3030 - Origin/Referer validation
└── scripts/
    └── reset-usuarios.js     # Script para resetear saldos a $1000
```

---

## 🛡️ Las 3 Defensas

### 1️⃣ Defensa 1: Tokens Anti-CSRF (Puerto 3010)

**El secreto compartido que el atacante no puede leer**

- **¿Qué es?** Un token único por sesión generado por el servidor
- **¿Cómo funciona?**
  1. Al cargar formulario → servidor genera token
  2. Token se incluye en campo oculto
  3. En POST → servidor verifica token
  4. Token inválido o ausente → 403 Forbidden
- **Ejecutar:** `npm run defense:token`
- **Documentación interactiva:** http://localhost:3010

**Analogía:** Llave secreta que solo tú y el banco conocen. El atacante no puede leerla (Same-Origin Policy).

---

### 2️⃣ Defensa 2: Cookies SameSite (Puertos 3020-3022)

**El navegador actúa como guardián de las cookies**

El navegador puede enviar cookies con restricciones según el contexto:

#### 2A. SameSite=Strict (Puerto 3020) 🔒

- **Bloqueo total:** Cookies NO se envían en NINGUNA petición cross-site
- **Caso de uso:** Apps de máxima seguridad (bancos, sistemas críticos)
- **Desventaja:** Enlaces externos no mantienen sesión
- **Ejecutar:** `npm run defense:strict`
- **Documentación:** http://localhost:3020

#### 2B. SameSite=Lax (Puerto 3021) ⚖️ ⭐ **RECOMENDADO**

- **Protección inteligente:**
  - ✅ Navegación GET de usuario (`<a href>`) → cookies SE envían
  - ❌ POST cross-site o en iframes → cookies NO se envían
- **Caso de uso:** La mayoría de aplicaciones web (valor por defecto en Chrome/Firefox)
- **Ejecutar:** `npm run defense:lax`
- **Documentación:** http://localhost:3021
- **Por qué es mejor:** Balance perfecto entre seguridad y experiencia de usuario

#### 2C. SameSite=None (Puerto 3022) ⚠️

- **Sin protección CSRF:** Cookies se envían en TODAS las peticiones
- **Requiere:** HTTPS (secure=true); demo en https://localhost:3022
- **Caso de uso:** Widgets embebidos, SSO, OAuth (SIEMPRE con tokens CSRF adicionales)
- **Ejecutar:** `npm run defense:none`
- **Documentación:** https://localhost:3022

**Página comparativa:** http://localhost:3021 (con enlaces a Strict/None)

---

### 3️⃣ Defensa 3: Verificación de Cabeceras (Puerto 3030)

**Verificar el remitente de la petición**

- **¿Qué es?** Validar cabeceras HTTP `Origin` y `Referer`
- **¿Cómo funciona?**
  1. POST desde origen diferente → servidor ve `origin: http://localhost:3001`
  2. Servidor compara con dominio esperado
  3. No coincide → 403 Forbidden
- **Ventaja:** Muy intuitivo; no requiere cambios en HTML
- **Ejecutar:** `npm run defense:headers`
- **Documentación interactiva:** http://localhost:3030

**Analogía:** Verificar el remitente del sobre antes de procesar la orden.

---

### 📊 Tabla Comparativa

| Defensa             | Complejidad | UX Impact | Compatibilidad       | Mejor Caso                              |
| ------------------- | ----------- | --------- | -------------------- | --------------------------------------- |
| **Token CSRF**      | Media       | Bajo      | Todas las versiones  | Estándar universal                      |
| **SameSite=Lax**    | Muy baja    | Ninguno   | Navegadores modernos | **RECOMENDADO**                         |
| **SameSite=Strict** | Muy baja    | Medio     | Navegadores modernos | Alta seguridad (rompe enlaces externos) |
| **Origin/Referer**  | Baja        | Ninguno   | Todas las versiones  | Validación adicional                    |

**💡 Mejor práctica:** Combinar **SameSite=Lax + Tokens CSRF** para defensa en profundidad.

---

## 🚀 Instalación y configuración

### Requisitos

- Node.js 14+
- npm
- Navegador moderno

### Pasos

1. **Instala dependencias:**

   ```bash
   npm install
   ```

2. **Ejecuta demos:**

   ```bash
   # Ataque vulnerable
   npm run start:vulnerable   # Terminal 1
   npm run start:attacker     # Terminal 2

   # O cualquier defensa
   npm run defense:token      # Token CSRF
   npm run defense:strict     # SameSite=Strict
   npm run defense:lax        # SameSite=Lax ⭐
   npm run defense:none       # SameSite=None (HTTPS)
   npm run defense:headers    # Origin/Referer
   ```

3. **Abre en navegador:**
   - Vulnerable: http://localhost:3000
   - Atacante: http://localhost:3001
   - Defensas: http://localhost:3010, 3020, 3021, 3022, 3030

### Usuarios de prueba

| Usuario | Contraseña   | Saldo inicial |
| ------- | ------------ | ------------- |
| `ana`   | `contrasena` | $1000         |

### Resetear saldos

Si los saldos cambiaron durante pruebas:

```bash
npm run reset
```

⚠️ **Importante:** Detén los servidores (`Ctrl+C`) antes de hacer reset, luego reinicia.

---

## 🎓 Cómo funciona el ataque CSRF

### 1. Fase de autenticación

```
Usuario (Ana)
    ↓
Inicia sesión en banco.com
    ↓
Servidor envía: Set-Cookie: connect.sid=...
    ↓
Navegador guarda cookie
```

### 2. Fase de ataque

```
Ana sigue conectada pero abre sitio-malicioso.com
    ↓
Sitio malicioso contiene:
  <form action="https://banco.com/transferencia" method="POST">
    <input name="monto" value="200">
    <input name="destino" value="cuenta-atacante">
  </form>
  <script>document.forms[0].submit();</script>
    ↓
Navegador AUTOMÁTICAMENTE envía:
  POST /transferencia
  Cookie: connect.sid=... ← ¡Se envió sin que Ana lo supiera!
    ↓
Banco ve: "Cookie válida" → "POST válido" → ¡Procesa transferencia!
```

### 3. Resultado

```
Saldo Ana: $1000 → $790 (perdió $210)
Atacante: Ganó $200
```

**¿Por qué no se bloqueó?**

- ❌ No hay token CSRF (formulario no lo incluye)
- ❌ No hay validación de Origin/Referer
- ❌ Cookie se envía aunque venga de otro dominio

---

## ✅ Cómo Verificar Cada Defensa

Cada defensa tiene una **página de documentación interactiva** con diagrama, ventajas y código. También puedes **inspeccionar en DevTools** del navegador.

### 🔍 Defensa 1: Token CSRF

**Verificación en DevTools:**

1. Abre http://localhost:3010 → Inicia sesión
2. **F12 → Elements (o Inspector)**
3. **Busca:** Formulario dentro de `<form>`
4. **Verás:** `<input type="hidden" name="_csrf" value="xyz123..."`
5. **Clave:** Cada recarga de página genera un token DIFERENTE

**Cómo ver el ataque bloqueado:**

1. DevTools abierto → Pestaña **Network** → **"Preserve log"** activado
2. Abre http://localhost:3001 (atacante) en otra pestaña
3. Haz clic en "Reclamar premio"
4. **Vuelve a DevTools** (en pestaña 3010)
5. **Busca petición POST a `/transferencia`**
6. **Status: 403 Forbidden** ← Rechazado por falta de token
7. **Response:** "ForbiddenError: invalid csrf token"

**Log alternativo:** Open http://localhost:3010/intentos.json para ver todas las peticiones rechazadas.

---

### 🔍 Defensa 2A: SameSite=Strict

**Verificación en DevTools:**

1. Abre http://localhost:3020 → Inicia sesión
2. **F12 → Application (o Storage) → Cookies**
3. **Busca cookie:** `connect.sid`
4. **Columna "SameSite":** Verás `Strict` ✅
5. **Columna "Secure":** `false` (normal en localhost)

**Cómo ver el ataque bloqueado:**

1. DevTools → Pestaña **Network** → **"Preserve log"** activado
2. Abre http://localhost:3001 (atacante)
3. Haz clic en "Reclamar premio"
4. **Vuelve a DevTools de 3020**
5. **Busca petición POST a `/transferencia`**
6. **Observación importante:**
   - Petición se ENVÍA
   - Pero **sin cookie** (columna "Cookies" en Headers está vacía)
7. **Status: 401 Unauthorized** (sin sesión válida)

**Lección:** El navegador NO envía la cookie en POST cross-site con SameSite=Strict.

---

### 🔍 Defensa 2B: SameSite=Lax

**Verificación en DevTools:**

1. Abre http://localhost:3021 → Inicia sesión
2. **F12 → Application → Cookies → `connect.sid`**
3. **Columna "SameSite":** Verás `Lax` ✅

**Cómo ver el ataque bloqueado (POST):**

1. DevTools → Network → "Preserve log"
2. Abre http://localhost:3001 (atacante)
3. Haz clic en "Reclamar premio"
4. **En Network de 3021:** Petición POST a `/transferencia`
5. **Status: 401 Unauthorized** (sin cookie, como Strict)

**DIFERENCIA con Strict (enlace normal):**

- Si alguien te envía un **enlace directo** a http://localhost:3021,
- Haces clic en él desde email/chat
- ✅ **SÍ mantiene sesión** (porque es navegación GET de usuario)
- ❌ **Strict NO mantendría sesión** (incluso en enlaces)

**Esto es la "protección inteligente" de Lax:**

- ✅ Permite navegación normal (links, bookmarks, direcciona tu browser)
- ❌ Bloquea peticiones POST/formularios cross-site
- ❌ Bloquea peticiones en iframes

---

### 🔍 Defensa 2C: SameSite=None

**Verificación en DevTools:**

1. Abre https://localhost:3022 → Acepta certificado autofirmado → Inicia sesión
2. **F12 → Application → Cookies → `connect.sid`**
3. **Columna "SameSite":** Verás `None` ⚠️
4. **Columna "Secure":** Verás `true` (HTTPS obligatorio)

**Cómo ver el ataque EXITOSO (¡SIN PROTECCIÓN!):**

1. DevTools → Network → "Preserve log"
2. Abre http://localhost:3001 (atacante)
3. Haz clic en "Reclamar premio"
4. **En Network de 3022:** Petición POST a `/transferencia`
5. **Status: 200 OK** ✅ (¡Transferencia procesada!)
6. **En Headers:** `Cookie: connect.sid=...` (cookie SÍ se envió)
7. Recarga https://localhost:3022 → **Saldo disminuyó** 💸

**Lección crítica:** SameSite=None por sí solo es VULNERABLE sin tokens CSRF adicionales. Solo se usa con:

- Widgets embebidos que necesitan cookies cross-site
- OAuth/SSO (con tokens adicionales)
- APIs que requieren CORS

---

### 🔍 Defensa 3: Verificación de Headers

**Verificación en DevTools:**

1. Abre http://localhost:3030 → Inicia sesión
2. DevTools → Network
3. **Haz una transferencia legítima** dentro de la aplicación
4. **Busca petición POST a `/transferencia`**
5. **Tab "Headers"**
6. **Busca "origin"** en Request Headers
7. **Verás:** `origin: http://localhost:3030` ✅

**Cómo ver el ataque bloqueado:**

1. Abre http://localhost:3001 (atacante)
2. Haz clic en "Reclamar premio"
3. **Vuelve a DevTools de 3030 → Network**
4. **Busca petición POST a `/transferencia`**
5. **Tab "Headers" → origin:**
   - **Request:** `origin: http://localhost:3001` ❌ (origen diferente)
6. **Status: 403 Forbidden**
7. **Response:** "Origen no autorizado" (servidor rechazó porque origen ≠ localhost:3030)

**Lección:** El servidor valida que la petición venga del mismo dominio.

---

## 📊 Contexto: Google y CORS

### Cómo se defiende Google

1. Abre https://www.google.com
2. **DevTools → Application → Cookies**
3. **Observa:** Cookies con `SameSite=Lax` (o `None+Secure`), `HttpOnly`
4. **Network:** Haz una búsqueda
5. **Headers de la petición:** Verás `origin: https://www.google.com`

**Conclusión:** Google usa **SameSite=Lax + probablemente Tokens CSRF en operaciones críticas + Headers validation**.

### ¿Qué es CORS?

**CORS (Cross-Origin Resource Sharing):** Política del navegador que decide si **JavaScript de un sitio puede LEER la respuesta** de otro sitio.

- **NO es defensa CSRF:** CORS no bloquea que se envíe la petición ni que se ejecute
- **Es complementario:** El atacante puede hacer la petición, pero no ver si tuvo éxito
- **Headers relevantes:**
  - `Access-Control-Allow-Origin` (qué orígenes pueden leer)
  - `Access-Control-Allow-Credentials` (si se envían cookies)
- **Conclusión:** CORS + Same-Origin Policy impide que el atacante vea el resultado de la transferencia

---

## 🎓 Guía para tu Presentación

### Orden recomendado (45 min total)

#### 1. Conceptos básicos (10 min)

- Explica qué es CSRF con analogía banco/atacante
- Muestra por qué las cookies se envían automáticamente
- Definición de "cambiar estado"

#### 2. Demostración del ataque (10 min)

- Terminal 1: `npm run start:vulnerable`
- Terminal 2: `npm run start:attacker`
- Inicia sesión en 3000 (Ana, $1000)
- Abre 3001 → Click "Reclamar premio"
- Vuelve a 3000 → Recarga → Saldo cambió ($790)
- **DevTools → Network:** Muestra petición POST con cookie
- **Conclusión:** Sin protecciones, el ataque funciona

#### 3. Las 3 defensas (20 min)

**Defensa 1 - Token CSRF (5 min):**

- `npm run defense:token`
- DevTools → Elements → Muestra `<input type="hidden" name="_csrf">`
- Intenta atacar desde 3001 → Status 403
- **Conclusión:** Token bloquea porque atacante no puede leerlo

**Defensa 2 - SameSite Lax (7 min):**

- `npm run defense:lax`
- Abre http://localhost:3021
- **DevTools → Cookies:** Muestra `SameSite: Lax`
- Intenta atacar → Status 401 (sin cookie)
- Muestra tabla comparativa (Strict/Lax/None)
- **Conclusión:** Navegador controla envío de cookies

**Defensa 3 - Headers (5 min):**

- `npm run defense:headers`
- DevTools → Network → POST
- **Headers:** Muestra `origin: http://localhost:3030` legítimo
- Intenta atacar → `origin: http://localhost:3001` → 403
- **Conclusión:** Servidor verifica remitente

#### 4. Conclusiones (5 min)

- **Mejor práctica:** SameSite=Lax + Tokens CSRF
- Las defensas son **complementarias**, no alternativas
- Google usa múltiples capas
- Responde preguntas

### 💡 Tips para la Presentación

| Aspecto                  | Tip                                                                                     |
| ------------------------ | --------------------------------------------------------------------------------------- |
| **Analogías**            | Llave secreta (Token), Guardián del navegador (SameSite), Remitente del sobre (Headers) |
| **Documentación visual** | Cada puerto (3010, 3020, 3021, 3030) tiene página interactiva con diagrama              |
| **DevTools eficiente**   | F12 → Application (Cookies), Network (peticiones/headers), Elements (HTML)              |
| **Velocidad**            | Abre todos los servidores antes; alterna entre pestañas sin escribir URLs               |
| **Demostración rápida**  | Si Network no captura a tiempo, abre `/intentos.json` para ver logs                     |
| **Impacto visual**       | Muestra cómo el saldo cambia sin interacción del usuario                                |

### ✅ Checklist Pre-Presentación

- ✅ `npm install` realizado
- ✅ Todos los servidores corriendo en terminales separadas
- ✅ DevTools abierto y Network con "Preserve log" listo
- ✅ Credenciales: `ana` / `contrasena`
- ✅ Analogías memorizadas
- ✅ Saldos reseteados: `npm run reset` + reiniciar servidores

### 🗣️ Frases Clave

- **CSRF:** "Fuerza al navegador a ejecutar acciones con tu sesión activa"
- **Ataque funciona porque:** "El navegador envía cookies automáticamente y el banco no valida el origen"
- **Token CSRF:** "Secreto que el atacante no puede leer (Same-Origin Policy lo impide)"
- **SameSite:** "El navegador decide cuándo enviar cookies según el contexto"
- **Headers:** "Servidor verifica que la petición viene del dominio autorizado"
- **Defensa en profundidad:** "Combinar múltiples defensas porque cada una puede fallar en ciertos escenarios"

---

## 🔎 URLs Rápidas

```
Ataque vulnerable:        http://localhost:3000 + http://localhost:3001
Token CSRF (doc):         http://localhost:3010
SameSite Strict (doc):    http://localhost:3020
SameSite Lax (doc):       http://localhost:3021
SameSite None (doc):      https://localhost:3022
Headers (doc):            http://localhost:3030
Ver intentos bloqueados:  http://localhost:3000/intentos.json
```

---

## 📖 Análisis del código vulnerable

### Servidor vulnerable (`vulnerable/server.js`)

**El problema principal:**

```javascript
app.post("/transferencia", (req, res) => {
  // ❌ NO hay validación de token CSRF
  // ❌ NO hay validación de Origin/Referer
  // ✅ NO hay SameSite (default envía siempre)

  const { monto, destino } = req.body;
  usuario.saldo -= monto;
  // ¡Transferencia procesada sin validar origen!
});
```

**¿Por qué es vulnerable?**

1. **Ninguna validación de CSRF:** Acepta POST sin token
2. **Cookies se envían siempre:** Default behavior, sin SameSite
3. **No valida origen:** No verifica Referer/Origin

**Resultado:** El atacante puede:

```
POST /transferencia
Content-Type: application/x-www-form-urlencoded

monto=200&destino=cuenta-atacante
```

Y el servidor procesa como si fuera Ana.

### Servidor con Token CSRF (`defense-1-token/server.js`)

```javascript
const csrf = require("csurf");
const csrfProtection = csrf({ cookie: false });

app.get("/cuenta", csrfProtection, (req, res) => {
  // Genera token único
  const token = req.csrfToken();
  res.send(`
    <form method="POST" action="/transferencia">
      <input type="hidden" name="_csrf" value="${token}">
      <input type="number" name="monto">
      <button>Transferir</button>
    </form>
  `);
});

app.post("/transferencia", csrfProtection, (req, res) => {
  // ✅ Token validado automáticamente por middleware
  // Si token inválido/ausente → 403 Forbidden
  const { monto, destino } = req.body;
  usuario.saldo -= monto;
});
```

**¿Por qué funciona?**

1. **Token único:** Cada sesión tiene token diferente
2. **Same-Origin Policy:** Atacante no puede leer el token (diferente dominio)
3. **Validación automática:** Middleware rechaza sin token válido

### Servidor con SameSite (`defense-2-samesite/lax/server.js`)

```javascript
session({
  cookie: {
    secure: false, // HTTP en localhost
    sameSite: "lax", // ← Protección SameSite
  },
});

app.post("/transferencia", (req, res) => {
  // ✅ SameSite=lax bloquea cookies en POST cross-site
  // Navegador NO envía cookie desde localhost:3001
  // Servidor ve: sin sesión válida → 401 Unauthorized
});
```

**¿Por qué funciona?**

1. **Navegador respeta SameSite:** No envía cookie en POST desde otro dominio
2. **Sin cookie = sin sesión:** Servidor rechaza petición
3. **SameSite=lax permite navegación:** Links sí mantienen sesión

### Servidor con Origin/Referer (`defense-3-headers/server.js`)

```javascript
app.post("/transferencia", (req, res) => {
  const origin = req.get("origin") || req.get("referer");
  const expectedOrigin = "http://localhost:3030";

  if (!origin || !origin.includes(expectedOrigin)) {
    return res.status(403).send("Origen no autorizado");
  }

  // ✅ Origin validado
  usuario.saldo -= monto;
});
```

**¿Por qué funciona?**

1. **Header Origin:** Navegador envía automáticamente en POST cross-origin
2. **Validación:** Servidor rechaza si no coincide con dominio esperado
3. **Atacante no puede spoofear:** Navegador genera este header automáticamente

---

## 🎯 Demostración paso a paso

### Preparación

1. Terminal 1: `npm run start:vulnerable`
2. Terminal 2: `npm run start:attacker`
3. Browser: F12 abierto, Network con "Preserve log"

### Ejecución

**Fase 1: Setup**

- Abre http://localhost:3000
- Inicia sesión: `ana` / `contrasena`
- **Muestra:** Saldo $1000

**Fase 2: Ataque**

- Nueva pestaña: http://localhost:3001
- **Explica:** "Esta página promete un premio pero tiene código malicioso"
- Click "Reclamar premio"

**Fase 3: Verificación**

- Vuelve a http://localhost:3000 → Recarga
- **Muestra:** Saldo $790 (perdió $210)
- DevTools → Network → Busca `transferencia`
- **Explica:** Petición POST con `Referer: localhost:3001` pero `Cookie: connect.sid` enviada

**Fase 4: Conclusión**

- "El navegador incluyó la cookie automáticamente"
- "El banco no validó el origen"
- "Resultado: $210 robados sin consentimiento"

---

## 💪 Ejercicios Prácticos

### Ejercicio 1: Probar cada defensa

1. Corre `npm run defense:token`
2. Inicia sesión ($1000)
3. Intenta atacar desde 3001
4. **Resultado:** Ataque bloqueado, saldo intacto
5. **Repite** con `defense:lax` y `defense:headers`

### Ejercicio 2: Inspeccionar el token

1. `npm run defense:token`
2. DevTools → Elements
3. **Busca:** `<input type="hidden" name="_csrf"`
4. **Nota:** Valor cambia cada recarga
5. **Prueba:** Copia el valor, cierra formulario, recarga → valor diferente

### Ejercicio 3: Ver SameSite en cookies

1. `npm run defense:lax`
2. DevTools → Application → Cookies
3. **Columna SameSite:** Verás `Lax`
4. **Columna Secure:** `false` (localhost)
5. **Nota:** En producción sería `Secure: true`

### Ejercicio 4: Headers en Network

1. `npm run defense:headers`
2. DevTools → Network
3. Haz transferencia legítima
4. Busca petición POST
5. **Headers:** Observa `origin: http://localhost:3030`

---

## ❓ Preguntas Frecuentes

### ¿Por qué SameSite=Lax es mejor que Strict?

**SameSite=Lax** permite navegación GET normal (cuando haces click en un enlace), por lo que la experiencia del usuario no se ve afectada. **Strict** bloquea incluso los enlaces, lo que puede ser incómodo. Lax obtiene el mejor balance.

### ¿Por qué el atacante no puede usar GET en lugar de POST?

Técnicamente podría, pero:

1. GET cambia estado es **mala práctica** (datos en URL)
2. SameSite=Lax permite GET de navegación pero bloquea GET en iframes/formularios
3. Servidores bien diseñados usan POST para cambios de estado

### ¿Qué es "cambiar estado"?

Significa modificar datos persistentes en el servidor:

- ✅ Transferencias, cambios de contraseña, eliminación de cuenta → Necesitan protección CSRF
- ❌ Búsquedas, descargas, visualización → No necesitan protección CSRF (el atacante no puede leer la respuesta)

### ¿CORS protege contra CSRF?

No. CORS solo controla si **JavaScript puede LEER la respuesta**. El atacante puede:

1. Enviar la petición (CORS no la bloquea)
2. Ejecutarla en el servidor (CORS no lo impide)
3. Solo no puede ver el resultado
   Por eso no es defensa CSRF directa, pero es complementario.

### ¿Por qué necesitamos HTTPS para SameSite=None?

Porque `SameSite=None` requiere `Secure: true` (HTTPS). Es un requisito de los navegadores para evitar ataques man-in-the-middle en conexiones inseguras.

### ¿Puedo usar solo Origin/Referer?

Es posible pero **no recomendado** porque:

1. Algunos proxies/firewalls eliminan estos headers
2. Las cookies SameSite son más robustas
3. Los tokens CSRF son estándar industrial
   **Mejor combinar múltiples defensas.**

### ¿Por qué no simplemente validar sesión?

Porque en un ataque CSRF **la sesión ES válida**. El atacante no genera una sesión falsa; usa la sesión legítima del usuario. Por eso las defensas deben validar además que la petición viene del usuario real (token, headers, navegador).

### ¿Qué hace `npm run reset`?

Restaura todos los usuarios a saldo inicial ($1000) reescribiendo `usuarios.json` en cada aplicación. Útil para repetir la demostración.

---

## 📚 Referencias

- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [MDN: SameSite Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite)
- [Express csurf Middleware](https://github.com/expressjs/csurf)
- [Same-Origin Policy](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy)
