# 📋 Sistema de Control de Asistencia ULEAM

Sistema web para el registro y control de asistencia del personal docente de la Universidad Laica Eloy Alfaro de Manabí.

## 🎯 Descripción

Aplicación web que permite gestionar la asistencia de docentes universitarios con dos roles de usuario:

- **Administrador**: Gestiona docentes, aprueba justificaciones, visualiza reportes y estadísticas.
- **Docente**: Marca su asistencia, edita su perfil, sube justificaciones y consulta su historial.

## 🛠️ Tecnologías Utilizadas

| Tecnología | Uso |
|-----------|-----|
| **HTML5 / CSS3 / JavaScript** | Frontend (interfaz de usuario) |
| **Node.js + Express** | Backend (servidor y API REST) |
| **SQLite** (`better-sqlite3`) | Base de datos relacional (archivo local) |
| **express-session** | Manejo de sesiones de usuario |
| **multer** | Subida de archivos (fotos, documentos) |
| **bcryptjs** | Encriptación de contraseñas |

## 📁 Estructura del Proyecto

```
appweb/
├── server.js              # Servidor Express principal
├── package.json           # Dependencias del proyecto
├── database.db            # Base de datos SQLite (se genera automáticamente)
├── db/
│   └── init.js            # Inicialización de tablas y datos demo
├── routes/
│   ├── auth.js            # Autenticación (login/logout)
│   ├── docentes.js        # CRUD de docentes
│   ├── asistencias.js     # Registro de asistencias
│   ├── horarios.js        # Gestión de horarios
│   └── justificaciones.js # Justificaciones de ausencias
├── middleware/
│   └── auth.js            # Middleware de autenticación y roles
├── uploads/               # Archivos subidos por usuarios
│   ├── perfiles/          # Fotos de perfil
│   └── justificaciones/   # Documentos de justificación
├── css/                   # Estilos de la interfaz
├── js/                    # Lógica del frontend
└── index.html             # Página principal
```

## 🚀 Instalación y Ejecución

1. **Clonar el repositorio**
   ```bash
   git clone <url-del-repo>
   cd appweb
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Iniciar el servidor**
   ```bash
   npm start
   ```
   O en modo desarrollo (con reinicio automático):
   ```bash
   npm run dev
   ```

4. **Abrir en el navegador**
   ```
   http://localhost:3000
   ```

## 👤 Credenciales de Prueba

| Rol | Correo | Contraseña |
|-----|--------|------------|
| Administrador | admin@uleam.edu.ec | admin123 |
| Docente | elena.rodriguez@uleam.edu.ec | docente123 |
| Docente | marco.velez@uleam.edu.ec | docente123 |

## 📝 Materia

**Aplicaciones para el Cliente Web**
Universidad Laica Eloy Alfaro de Manabí (ULEAM)
