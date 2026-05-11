// @ts-nocheck
// Entry point

window.addEventListener('error', (e) => {
    alert(`Global error: ${e.message} at ${e.filename}:${e.lineno}`);
    document.body.innerHTML += `<div style="position:fixed; top:0; left:0; right:0; background:red; z-index:99999; color:white; padding:20px">${e.message} - ${e.filename}:${e.lineno} <br/> <pre>${e.error?.stack}</pre></div>`;
});

window.VITE_GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
