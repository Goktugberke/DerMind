import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { combineReducers } from '@reduxjs/toolkit';

import authReducer from './slices/authSlice';
import cartReducer from './slices/cartSlice';
import routineReducer from './slices/routineSlice';
import themeReducer from './slices/themeSlice';

const authPersistConfig = {
  key: 'auth',
  storage,
  blacklist: ['loading', 'error'],
};

const cartPersistConfig = {
  key: 'cart',
  storage,
  blacklist: ['loading', 'error'],
};

const rootReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authReducer),
  cart: persistReducer(cartPersistConfig, cartReducer),
  routine: routineReducer,
  theme: themeReducer,
});

const rootPersistConfig = {
  key: 'root',
  storage,
  whitelist: ['routine', 'theme'], // auth ve cart kendi içlerinde persist ediliyor
};

const persistedReducer = persistReducer(rootPersistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

