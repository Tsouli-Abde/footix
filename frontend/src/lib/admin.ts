const KEY = 'footix.admin';

/**
 * Le mot de passe admin de la session en cours.
 *
 * `sessionStorage` et pas `localStorage` : fermer l'onglet referme la vue. Un
 * outil interne n'a pas besoin de plus, mais il n'a pas non plus besoin de
 * laisser le mot de passe traîner sur la machine indéfiniment.
 */
export const adminPassword = () => sessionStorage.getItem(KEY);
export const rememberAdminPassword = (password: string) => sessionStorage.setItem(KEY, password);
export const forgetAdminPassword = () => sessionStorage.removeItem(KEY);
