const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para parsear JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Habilitar CORS para Roblox
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Base de datos temporal en memoria
let keysDatabase = [];

// Servir archivos estáticos
app.use(express.static(__dirname));

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Endpoint para verificar keys desde Roblox
app.post('/api/verify-key', (req, res) => {
    try {
        const { key, hwid } = req.body;
        console.log('🔍 Verificando key:', key, 'HWID:', hwid);

        if (!key) {
            return res.json({ valid: false, message: "No key provided" });
        }

        const keyData = keysDatabase.find(k => k.key === key);

        if (!keyData) {
            console.log('❌ Key no encontrada');
            return res.json({ valid: false, message: "Invalid Key" });
        }

        if (keyData.hwid && keyData.hwid !== hwid) {
            console.log('❌ Key ya usada por otro usuario');
            return res.json({ valid: false, message: "Key already used on another device" });
        }

        const now = new Date();
        if (keyData.expirationDate && new Date(keyData.expirationDate) < now) {
            console.log('❌ Key expirada');
            return res.json({ valid: false, message: "Key expired" });
        }

        if (!keyData.hwid) {
            keyData.hwid = hwid;
            keyData.linkedDate = new Date().toISOString();
            console.log('✅ Key vinculada al HWID:', hwid);
        }

        console.log('✅ Acceso concedido');
        return res.json({
            valid: true,
            message: "Access granted",
            expiresAt: keyData.expirationDate,
            linkedDate: keyData.linkedDate
        });

    } catch (error) {
        console.error('❌ Error verificando key:', error);
        return res.json({ valid: false, message: "Server error" });
    }
});

// Endpoint para agregar keys desde el frontend
app.post('/api/add-key', (req, res) => {
    try {
        const { key, expirationDate, createdAt } = req.body;

        const exists = keysDatabase.find(k => k.key === key);
        if (exists) {
            return res.json({ success: false, message: "Key already exists" });
        }

        keysDatabase.push({
            key: key,
            expirationDate: expirationDate,
            createdAt: createdAt,
            hwid: null,
            linkedDate: null
        });

        console.log('✅ Key agregada:', key);
        return res.json({ success: true, message: "Key added successfully" });

    } catch (error) {
        console.error('❌ Error agregando key:', error);
        return res.json({ success: false, message: "Server error" });
    }
});

// Endpoint para eliminar una key
app.post('/api/delete-key', (req, res) => {
    try {
        const { key } = req.body;
        const index = keysDatabase.findIndex(k => k.key === key);
        
        if (index === -1) {
            return res.json({ success: false, message: "Key not found" });
        }

        keysDatabase.splice(index, 1);
        console.log('🗑️ Key eliminada:', key);
        return res.json({ success: true, message: "Key deleted successfully" });

    } catch (error) {
        console.error('❌ Error eliminando key:', error);
        return res.json({ success: false, message: "Server error" });
    }
});

// Endpoint para resetear HWID de una key
app.post('/api/reset-hwid', (req, res) => {
    try {
        const { key } = req.body;
        const keyData = keysDatabase.find(k => k.key === key);
        
        if (!keyData) {
            return res.json({ success: false, message: "Key not found" });
        }

        keyData.hwid = null;
        keyData.linkedDate = null;
        console.log('🔄 HWID reseteado para key:', key);
        return res.json({ success: true, message: "HWID reset successfully" });

    } catch (error) {
        console.error('❌ Error reseteando HWID:', error);
        return res.json({ success: false, message: "Server error" });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`📡 API disponible en http://localhost:${PORT}/api/verify-key`);
});
