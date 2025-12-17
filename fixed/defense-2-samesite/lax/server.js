const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const path = require("path");
const fs = require("fs");

const app = express();
const ARCHIVO_USUARIOS = path.join(__dirname, "usuarios.json");

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(
  session({
    secret: "demo-samesite-lax",
    resave: false,
    saveUninitialized: true,
    // ✅ DEFENSA 2B: SameSite=Lax (Protección inteligente)
    // Permite cookies en navegación GET (enlaces), bloquea POST cross-site
    cookie: {
      secure: false,
      sameSite: "lax", // ⭐ Estándar actual en Chrome/Firefox
    },
  })
);

app.use(express.static(path.join(__dirname, "public")));

function cargarUsuarios() {
  try {
    return JSON.parse(fs.readFileSync(ARCHIVO_USUARIOS, "utf8"));
  } catch (e) {
    return { ana: { password: "contrasena", balance: 1000 } };
  }
}
function guardarUsuarios(usuarios) {
  fs.writeFileSync(ARCHIVO_USUARIOS, JSON.stringify(usuarios, null, 2));
}
let usuarios = cargarUsuarios();

app.get("/iniciar-sesion", (req, res) => {
  res.send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Iniciar sesión - SameSite=Lax</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">
  <div class="container py-5">
    <div class="row justify-content-center">
      <div class="col-md-8">
        <div class="alert alert-primary">
          <h5>⚖️ Defensa 2B: SameSite=Lax</h5>
          <p class="mb-0"><strong>Protección inteligente:</strong> Permite enlaces externos (GET), bloquea formularios externos (POST).</p>
        </div>
        <div class="card shadow-sm">
          <div class="card-body">
            <h3 class="card-title">Iniciar sesión</h3>
            <form method="POST" action="/iniciar-sesion">
              <div class="mb-3">
                <label class="form-label">Usuario</label>
                <input class="form-control" name="usuario" required />
              </div>
              <div class="mb-3">
                <label class="form-label">Contraseña</label>
                <input class="form-control" name="password" type="password" required />
              </div>
              <button class="btn btn-primary">Entrar</button>
            </form>
          </div>
        </div>
        <div class="card mt-3">
          <div class="card-body">
            <h6>🔍 SameSite=Lax (Recomendado):</h6>
            <ul class="small mb-0">
              <li><strong>✅ Enlaces externos funcionan</strong> (GET top-level navigation)</li>
              <li><strong>✅ Protege contra CSRF</strong> en formularios POST</li>
              <li><strong>✅ Mejor experiencia de usuario</strong> que Strict</li>
              <li><strong>⭐ Es el valor por defecto</strong> en Chrome y Firefox modernos</li>
              <li><strong>Uso ideal:</strong> La mayoría de aplicaciones web</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`);
});

app.post("/iniciar-sesion", (req, res) => {
  const { usuario, password } = req.body;
  if (!usuario || !password) return res.redirect("/iniciar-sesion");
  const u = usuarios[usuario];
  if (!u || u.password !== password) return res.send("Credenciales inválidas");
  req.session.usuario = usuario;
  res.redirect("/cuenta");
});

app.get("/cerrar-sesion", (req, res) => {
  req.session.destroy(() => res.send("Sesión cerrada"));
});

app.get("/cuenta", (req, res) => {
  if (!req.session || !req.session.usuario) {
    return res.send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Banco - SameSite Lax</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">
  <div class="container py-5">
    <h1>Banco - SameSite=Lax</h1>
    <p>Por favor <a href="/iniciar-sesion">inicie sesión</a> para ver su cuenta.</p>
  </div>
</body>
</html>`);
  }
  const usuario = req.session.usuario;
  const balance = usuarios[usuario].balance;

  return res.send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Cuenta de ${usuario} - SameSite Lax</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-white">
  <nav class="navbar bg-primary navbar-dark">
    <div class="container">
      <a class="navbar-brand" href="#">⚖️ Defensa 2B: SameSite=Lax</a>
      <div class="text-light">Usuario: ${usuario} | <a href="/cerrar-sesion" class="link-light">Cerrar sesión</a></div>
    </div>
  </nav>
  <div class="container py-5">
    <div class="row">
      <div class="col-md-6">
        <div class="card shadow-sm mb-3">
          <div class="card-body">
            <h4>Saldo: <strong>$${balance}</strong></h4>
            <p>Realice una transferencia.</p>
            <form action="/transferencia" method="POST">
              <div class="mb-3">
                <label class="form-label">Monto</label>
                <input class="form-control" name="monto" value="100" />
              </div>
              <div class="mb-3">
                <label class="form-label">Destino</label>
                <input class="form-control" name="destino" value="cuenta-amigo" />
              </div>
              <button class="btn btn-primary">Transferir</button>
            </form>
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="alert alert-primary">
          <h6>⚖️ SameSite=Lax activado</h6>
          <p class="small mb-2">El navegador envía cookies en enlaces GET, pero NO en formularios POST cross-site.</p>
          <table class="table table-sm small">
            <thead>
              <tr>
                <th>Petición</th>
                <th>¿Cookie enviada?</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Enlace &lt;a href&gt;</td>
                <td>✅ SÍ</td>
              </tr>
              <tr>
                <td>Formulario POST externo</td>
                <td>❌ NO</td>
              </tr>
              <tr>
                <td>Imagen &lt;img&gt;</td>
                <td>❌ NO</td>
              </tr>
            </tbody>
          </table>
          <hr>
          <p class="small mb-0"><strong>Prueba:</strong> Ataque desde <a href="http://localhost:3001" target="_blank">localhost:3001</a> fallará en POST.</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`);
});

app.post("/transferencia", (req, res) => {
  if (!req.session || !req.session.usuario)
    return res.status(401).send("No ha iniciado sesión");
  const usuario = req.session.usuario;
  const monto = Number(req.body.monto || 0);
  const destino = req.body.destino || "desconocido";
  if (monto > 0 && usuarios[usuario].balance >= monto) {
    usuarios[usuario].balance -= monto;
    guardarUsuarios(usuarios);
    console.log(
      `✅ [Lax] Transferencia: $${monto} desde ${usuario} a ${destino}`
    );
    return res.send(
      `✅ Transferido $${monto} a ${destino}. Nuevo saldo: $${usuarios[usuario].balance}`
    );
  }
  res.status(400).send("Transferencia inválida");
});

app.get("/donar", (req, res) => {
  res.status(405).send("Método no permitido");
});

app.get("/", (req, res) => res.redirect("/cuenta"));

app.listen(3021, () =>
  console.log(
    "⚖️ Defensa 2B (SameSite=Lax) escuchando en http://localhost:3021"
  )
);
