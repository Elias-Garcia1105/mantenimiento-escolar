// Doble de prueba: simula un navegador cuyo permiso de ubicación está en estado "prompt"
// y en el que el usuario rechaza la solicitud.
(() => {
  let estado = 'prompt';
  const origQuery = navigator.permissions.query.bind(navigator.permissions);
  navigator.permissions.query = (desc) =>
    desc && desc.name === 'geolocation' ? Promise.resolve({ state: estado, onchange: null }) : origQuery(desc);
  const err = { code: 1, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3, message: 'User denied Geolocation' };
  navigator.geolocation.getCurrentPosition = (ok, fail) => setTimeout(() => { estado = 'denied'; fail && fail(err); }, 600);
  navigator.geolocation.watchPosition = (ok, fail) => { setTimeout(() => fail && fail(err), 600); return 1; };
})();
