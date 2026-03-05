// Array para almacenar las keys generadas
let keys = [];
let currentHWID = '';

// Cargar keys desde localStorage al iniciar
window.addEventListener('DOMContentLoaded', () => {
    loadKeysFromStorage();
    initOptimizedRain();
    generateHWID();
    updateKeysList();
    updateActiveCount();
});

/**
 * Genera un HWID único para el dispositivo actual
 */
function generateHWID() {
    // Intentar obtener HWID guardado
    let hwid = localStorage.getItem('deviceHWID');
    
    if (!hwid) {
        // Generar nuevo HWID basado en características del navegador
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('HWID', 2, 2);
        
        const canvasData = canvas.toDataURL();
        const navigatorData = [
            navigator.userAgent,
            navigator.language,
            screen.width,
            screen.height,
            screen.colorDepth,
            new Date().getTimezoneOffset(),
            canvasData
        ].join('|');
        
        // Generar hash simple
        hwid = 'HWID-' + simpleHash(navigatorData);
        localStorage.setItem('deviceHWID', hwid);
    }
    
    currentHWID = hwid;
}

/**
 * Función hash simple para generar HWID
 */
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36).toUpperCase().substring(0, 12);
}

/**
 * Resetea el HWID de una key para poder usarla en otro dispositivo
 */
function resetKeyHWID() {
    const keyInput = document.getElementById('keyToReset');
    const key = keyInput.value.trim().toUpperCase();
    
    if (!key) {
        showHWIDResult('resetResult', 'Por favor ingrese una key', 'error');
        return;
    }
    
    // Buscar la key localmente
    const keyObject = keys.find(k => k.key === key);
    
    if (!keyObject) {
        showHWIDResult('resetResult', 'Key no encontrada', 'error');
        return;
    }
    
    if (!keyObject.hwid) {
        showHWIDResult('resetResult', 'Esta key no está vinculada', 'warning');
        return;
    }
    
    // Resetear HWID localmente
    keyObject.hwid = null;
    keyObject.linkedDate = null;
    
    saveKeysToStorage();
    updateKeysList();
    
    // Resetear en el servidor
    fetch('/api/reset-hwid', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ key: key })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('✅ HWID reseteado en el servidor');
            showHWIDResult('resetResult', 'HWID reseteado correctamente', 'success');
        } else {
            showHWIDResult('resetResult', 'Error al resetear en servidor', 'error');
        }
    })
    .catch(error => {
        console.error('❌ Error de red:', error);
        showHWIDResult('resetResult', 'HWID reseteado localmente', 'warning');
    });
    
    keyInput.value = '';
}

/**
 * Muestra resultado de operaciones HWID
 */
function showHWIDResult(elementId, message, type) {
    const resultElement = document.getElementById(elementId);
    
    resultElement.textContent = message;
    resultElement.className = `hwid-result ${type}`;
    resultElement.classList.remove('hidden');
    
    // Auto-ocultar después de 5 segundos
    setTimeout(() => {
        resultElement.classList.add('hidden');
    }, 5000);
}

/**
 * Inicializa la lluvia optimizada con canvas
 */
function initOptimizedRain() {
    const canvas = document.getElementById('rainCanvas');
    const ctx = canvas.getContext('2d', { alpha: true });
    
    // Ajustar tamaño del canvas
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    
    // Configuración de lluvia optimizada
    const raindrops = [];
    const maxDrops = 150; // Limitado para rendimiento
    
    // Crear gotas de lluvia
    for (let i = 0; i < maxDrops; i++) {
        raindrops.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            length: Math.random() * 20 + 10,
            speed: Math.random() * 3 + 4,
            opacity: Math.random() * 0.3 + 0.2
        });
    }
    
    // Función de animación optimizada
    function animate() {
        // Limpiar canvas con transparencia
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Dibujar gotas
        ctx.strokeStyle = 'rgba(174, 194, 224, 0.5)';
        ctx.lineWidth = 1;
        
        for (let i = 0; i < raindrops.length; i++) {
            const drop = raindrops[i];
            
            // Dibujar gota
            ctx.globalAlpha = drop.opacity;
            ctx.beginPath();
            ctx.moveTo(drop.x, drop.y);
            ctx.lineTo(drop.x, drop.y + drop.length);
            ctx.stroke();
            
            // Actualizar posición
            drop.y += drop.speed;
            
            // Reiniciar gota si sale de la pantalla
            if (drop.y > canvas.height) {
                drop.y = -drop.length;
                drop.x = Math.random() * canvas.width;
            }
        }
        
        ctx.globalAlpha = 1;
        requestAnimationFrame(animate);
    }
    
    // Iniciar animación
    animate();
    
    // Redimensionar canvas al cambiar tamaño de ventana
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            resizeCanvas();
            // Reposicionar gotas
            raindrops.forEach(drop => {
                if (drop.x > canvas.width) {
                    drop.x = Math.random() * canvas.width;
                }
            });
        }, 250);
    });
}

/**
 * Genera una key aleatoria con formato KEY-XXXXXXXX
 * @returns {string} Key generada
 */
function generateRandomKey() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomPart = '';
    
    for (let i = 0; i < 8; i++) {
        randomPart += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    return `KEY-${randomPart}`;
}

/**
 * Genera una nueva key con la expiración especificada
 */
function generateKey() {
    const daysInput = document.getElementById('days');
    let days = parseInt(daysInput.value);
    
    // Validar días
    if (!days || days < 1 || isNaN(days)) {
        alert('Por favor ingrese un número válido de días (mínimo 1)');
        return;
    }
    
    // Generar key
    const key = generateRandomKey();
    
    // Calcular fecha de expiración
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + days);
    
    // Crear objeto de key
    const keyObject = {
        key: key,
        expirationDate: expirationDate.toISOString(),
        createdAt: new Date().toISOString()
    };
    
    // Agregar a la lista local
    keys.unshift(keyObject);
    
    // Guardar en localStorage
    saveKeysToStorage();
    
    // Enviar al servidor
    fetch('/api/add-key', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(keyObject)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('✅ Key sincronizada con el servidor');
        } else {
            console.error('❌ Error al sincronizar key:', data.message);
        }
    })
    .catch(error => {
        console.error('❌ Error de red:', error);
    });
    
    // Mostrar resultado
    displayGeneratedKey(key, expirationDate);
    
    // Actualizar lista
    updateKeysList();
    updateActiveCount();
    
    // Limpiar input
    daysInput.value = 30;
}

/**
 * Muestra la key generada en la interfaz
 */
function displayGeneratedKey(key, expirationDate) {
    const resultBox = document.getElementById('generatedResult');
    const keyElement = document.getElementById('generatedKey');
    const dateElement = document.getElementById('expirationDate');
    
    // Efecto de escritura animada para la key
    keyElement.textContent = '';
    dateElement.textContent = formatDate(expirationDate);
    
    resultBox.classList.remove('hidden');
    
    // Animación de escritura carácter por carácter
    let index = 0;
    const writeInterval = setInterval(() => {
        if (index < key.length) {
            keyElement.textContent += key[index];
            index++;
        } else {
            clearInterval(writeInterval);
        }
    }, 50);
}

/**
 * Copia la key al portapapeles
 */
function copyKey(event) {
    const keyElement = document.getElementById('generatedKey');
    const key = keyElement.textContent;
    
    if (!key) {
        return;
    }
    
    navigator.clipboard.writeText(key).then(() => {
        // Feedback visual hermoso
        const btn = event.target.closest('.btn-copy-compact');
        if (!btn) return;
        
        const originalHTML = btn.innerHTML;
        const originalStyle = btn.style.cssText;
        
        // Cambiar a estado "copiado" con estilo hermoso
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 16px; height: 16px;">
                <path d="M20 6L9 17l-5-5"/>
            </svg>
            ¡Copiado!
        `;
        btn.style.background = 'linear-gradient(135deg, #5cb85c 0%, #4caf50 100%)';
        btn.style.boxShadow = '0 4px 15px rgba(76, 175, 80, 0.5)';
        btn.style.transform = 'scale(1.05)';
        
        // Volver al estado original después de 2 segundos
        setTimeout(() => {
            btn.style.transform = 'scale(1)';
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.style.cssText = originalStyle;
            }, 200);
        }, 2000);
    }).catch(err => {
        console.error('Error al copiar:', err);
        
        // Mostrar error con estilo hermoso
        const btn = event.target.closest('.btn-copy-compact');
        if (!btn) return;
        
        const originalHTML = btn.innerHTML;
        const originalStyle = btn.style.cssText;
        
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            Error
        `;
        btn.style.background = 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)';
        btn.style.boxShadow = '0 4px 15px rgba(231, 76, 60, 0.5)';
        
        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.style.cssText = originalStyle;
        }, 2000);
    });
}

/**
 * Actualiza la lista de keys en el panel lateral
 */
function updateKeysList() {
    const keysList = document.getElementById('keysList');
    
    if (keys.length === 0) {
        keysList.innerHTML = '<p class="empty-message">No hay keys generadas aún</p>';
        return;
    }
    
    keysList.innerHTML = '';
    
    keys.forEach((keyObject, index) => {
        const keyItem = createKeyItem(keyObject, index);
        keysList.appendChild(keyItem);
    });
}

/**
 * Crea un elemento HTML para una key
 */
function createKeyItem(keyObject, index) {
    const now = new Date();
    const expirationDate = new Date(keyObject.expirationDate);
    const isExpired = now > expirationDate;
    
    const keyItem = document.createElement('div');
    keyItem.className = 'key-item';
    
    // Indicador de HWID
    let hwidStatus = '';
    if (keyObject.hwid) {
        const isThisDevice = keyObject.hwid === currentHWID;
        hwidStatus = `
            <div style="font-size: 0.75rem; color: ${isThisDevice ? '#5cb85c' : '#f0ad4e'}; margin-top: 0.25rem;">
                ${isThisDevice ? 'Vinculada aquí' : 'Vinculada en otro PC'}
            </div>
        `;
    }
    
    keyItem.innerHTML = `
        <div class="key-item-header">
            <span class="key-text">${keyObject.key}</span>
            <span class="status-badge ${isExpired ? 'expired' : 'active'}">
                ${isExpired ? 'Expirada' : 'Activa'}
            </span>
        </div>
        <div class="key-date">
            Expira: ${formatDate(expirationDate)}
        </div>
        ${hwidStatus}
        <button class="btn-delete" onclick="deleteKey(${index})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
            Eliminar
        </button>
    `;
    
    return keyItem;
}

/**
 * Elimina una key del sistema
 */
function deleteKey(index) {
    const keyToDelete = keys[index].key;
    
    keys.splice(index, 1);
    saveKeysToStorage();
    updateKeysList();
    updateActiveCount();
    
    // Eliminar del servidor
    fetch('/api/delete-key', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ key: keyToDelete })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('✅ Key eliminada del servidor');
        }
    })
    .catch(error => {
        console.error('❌ Error al eliminar del servidor:', error);
    });
}

/**
 * Actualiza el contador de keys activas
 */
function updateActiveCount() {
    const now = new Date();
    const activeKeys = keys.filter(k => new Date(k.expirationDate) > now);
    
    document.getElementById('activeCount').textContent = activeKeys.length;
}

/**
 * Formatea una fecha para mostrarla
 */
function formatDate(date) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Guarda las keys en localStorage
 */
function saveKeysToStorage() {
    try {
        localStorage.setItem('generatedKeys', JSON.stringify(keys));
    } catch (error) {
        console.error('Error al guardar en localStorage:', error);
    }
}

/**
 * Carga las keys desde localStorage
 */
function loadKeysFromStorage() {
    try {
        const storedKeys = localStorage.getItem('generatedKeys');
        if (storedKeys) {
            keys = JSON.parse(storedKeys);
        }
    } catch (error) {
        console.error('Error al cargar desde localStorage:', error);
        keys = [];
    }
}

// Permitir generar con Enter en el input
document.addEventListener('DOMContentLoaded', () => {
    const daysInput = document.getElementById('days');
    if (daysInput) {
        daysInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                generateKey();
            }
        });
        
        // Validar solo números en el input
        daysInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
        });
    }
});
