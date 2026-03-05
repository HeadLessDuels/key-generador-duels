const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de Supabase
const SUPABASE_URL = 'https://ypwanrgfkmoogolkqev.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlwd2Fucmdma21vb2dvbGtxZXYiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczNTk1NzU0NiwiZXhwIjoyMDUxNTMzNTQ2fQ.ceSNEBtiZnE7BNUNFT5uZQ_nMx191q3';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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

// Servir archivos estáticos
app.use(express.static(__dirname));

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ============================================
// ENDPOINTS PARA ROBLOX
// ============================================

// Endpoint para verificar keys desde Roblox
app.post('/api/verify-key', async (req, res) => {
    try {
        const { key, hwid } = req.body;

        console.log('🔍 Verificando key:', key, 'HWID:', hwid);

        if (!key) {
            return res.json({
                valid: false,
                message: "No key provided"
            });
        }

        // Buscar la key en Supabase
        const { data: keyData, error } = await supabase
            .from('keys')
            .select('*')
            .eq('key', key)
            .single();

        if (error || !keyData) {
            console.log('❌ Key no encontrada');
            return res.json({
                valid: false,
                message: "Invalid Key"
            });
        }

        // Verificar si la key ya fue usada por otro usuario
        if (keyData.hwid && keyData.hwid !== hwid) {
            console.log('❌ Key ya usada por otro usuario');
            return res.json({
                valid: false,
                message: "Key already used on another device"
            });
        }

        // Verificar si la key expiró
        const now = new Date();
        if (keyData.expiration_date && new Date(keyData.expiration_date) < now) {
            console.log('❌ Key expirada');
            return res.json({
                valid: false,
                message: "Key expired"
            });
        }

        // Vincular la key al HWID si es la primera vez
        if (!keyData.hwid) {
            await supabase
                .from('keys')
                .update({
                    hwid: hwid,
                    linked_date: new Date().toISOString()
                })
                .eq('key', key);
            
            console.log('✅ Key vinculada al HWID:', hwid);
        }

        // Key válida
        console.log('✅ Acceso concedido');
        return res.json({
            valid: true,
            message: "Access granted",
            expiresAt: keyData.expiration_date,
            linkedDate: keyData.linked_date
        });

    } catch (error) {
        console.error('❌ Error verificando key:', error);
        return res.json({
            valid: false,
            message: "Server error"
        });
    }
});

// Endpoint para agregar keys desde el frontend
app.post('/api/add-key', async (req, res) => {
    try {
        const { key, expirationDate, createdAt } = req.body;

        // Verificar que la key no exista ya
        const { data: existing } = await supabase
            .from('keys')
            .select('key')
            .eq('key', key)
            .single();

        if (existing) {
            return res.json({
                success: false,
                message: "Key already exists"
            });
        }

        // Agregar la key a Supabase
        const { error } = await supabase
            .from('keys')
            .insert([{
                key: key,
                expiration_date: expirationDate,
                created_at: createdAt,
                hwid: null,
                linked_date: null
            }]);

        if (error) {
            console.error('❌ Error al insertar:', error);
            return res.json({
                success: false,
                message: "Error adding key"
            });
        }

        console.log('✅ Key agregada:', key);

        return res.json({
            success: true,
            message: "Key added successfully"
        });

    } catch (error) {
        console.error('❌ Error agregando key:', error);
        return res.json({
            success: false,
            message: "Server error"
        });
    }
});

// Endpoint para obtener todas las keys
app.get('/api/keys', async (req, res) => {
    try {
        const { data: keys, error } = await supabase
            .from('keys')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            return res.json({
                success: false,
                message: "Error fetching keys"
            });
        }

        return res.json({
            success: true,
            keys: keys
        });

    } catch (error) {
        console.error('❌ Error obteniendo keys:', error);
        return res.json({
            success: false,
            message: "Server error"
        });
    }
});

// Endpoint para eliminar una key
app.post('/api/delete-key', async (req, res) => {
    try {
        const { key } = req.body;

        const { error } = await supabase
            .from('keys')
            .delete()
            .eq('key', key);

        if (error) {
            return res.json({
                success: false,
                message: "Key not found"
            });
        }

        console.log('🗑️ Key eliminada:', key);

        return res.json({
            success: true,
            message: "Key deleted successfully"
        });

    } catch (error) {
        console.error('❌ Error eliminando key:', error);
        return res.json({
            success: false,
            message: "Server error"
        });
    }
});

// Endpoint para resetear HWID de una key
app.post('/api/reset-hwid', async (req, res) => {
    try {
        const { key } = req.body;

        const { error } = await supabase
            .from('keys')
            .update({
                hwid: null,
                linked_date: null
            })
            .eq('key', key);

        if (error) {
            return res.json({
                success: false,
                message: "Key not found"
            });
        }

        console.log('🔄 HWID reseteado para key:', key);

        return res.json({
            success: true,
            message: "HWID reset successfully"
        });

    } catch (error) {
        console.error('❌ Error reseteando HWID:', error);
        return res.json({
            success: false,
            message: "Server error"
        });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`📡 API disponible en http://localhost:${PORT}/api/verify-key`);
    console.log(`💾 Usando Supabase para almacenamiento permanente`);
});
