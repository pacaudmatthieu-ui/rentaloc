/**
 * Isolation CSS pour l'intégration WordPress sans iframe :
 * chaque sélecteur est préfixé par .rentaloc-app (le conteneur racine),
 * et les sélecteurs globaux (:root, body, html) sont reportés sur lui.
 * Ainsi, aucun style du simulateur ne fuit sur le site hôte.
 */
const prefixer = require('postcss-prefix-selector')

module.exports = {
  plugins: [
    prefixer({
      prefix: '.rentaloc-app',
      transform(prefix, selector, prefixedSelector, filePath) {
        // Le <style> inline de index.html (site autonome) reste global :
        // Vite le fait transiter par PostCSS sous un id « html-proxy »
        if (filePath && filePath.includes('html-proxy')) return selector
        if (selector.includes('.rentaloc-app')) return selector
        if (selector === ':root' || selector === 'html' || selector === 'body') return prefix
        if (selector === '#root') return prefix
        return prefixedSelector
      },
    }),
  ],
}
