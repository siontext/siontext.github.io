// GoatCounter pageview tracking (loaded globally via hugo.toml custom_js).
// endpoint 의 코드는 hugo.toml 의 goatcounter_code 와 동일하게 유지할 것.
(function () {
  window.goatcounter = window.goatcounter || {};
  window.goatcounter.endpoint = 'https://siontext.goatcounter.com/count';

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://gc.zgo.at/count.js';
  document.head.appendChild(s);
})();
