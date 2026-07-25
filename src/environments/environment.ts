// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.
export const environment = {
  production: false,
  // Staging server URLs
  apiUrl: 'https://inventorymanagement-backend-staging.onrender.com/api',
  permissionsUrl: 'https://inventorymanagement-backend-staging.onrender.com/api/permissions',
  hrUrl: 'https://inventorymanagement-backend-staging.onrender.com/api/hr',
  productsUrl: 'https://inventorymanagement-backend-staging.onrender.com/api/products',
  distributorUrl: 'https://inventorymanagement-backend-staging.onrender.com/api/distributors',
  ledgerUrl: 'https://inventorymanagement-backend-staging.onrender.com/api/ledger',
  dealersUrl: 'https://inventorymanagement-backend-staging.onrender.com/api/dealers',
  dealerLedgerUrl: 'https://inventorymanagement-backend-staging.onrender.com/api/dealer-ledger',

  // Localhost URLs
  // apiUrl: 'http://localhost:8080/api',
  // permissionsUrl: 'http://localhost:8080/api/permissions',
  // hrUrl: 'http://localhost:8080/api/hr',
  // productsUrl: 'http://localhost:8080/api/products',
  // distributorUrl: 'http://localhost:8080/api/distributors',
  // ledgerUrl: 'http://localhost:8080/api/ledger',
  // dealersUrl: 'http://localhost:8080/api/dealers',
  // dealerLedgerUrl: 'http://localhost:8080/api/dealer-ledger',
};


/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */