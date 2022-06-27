import {DataRes, ErrorOrInfo, GetScope, Route} from '@storng/common';

import {Store} from './store';
import {defRestorePreparation} from './sync.object.helpers/def.restore.preparation';
import {firstSubscriptionCb} from './sync.object.helpers/first-subscription-cb';
import {getUpdater} from './sync.object.helpers/get-updater';
import {prepareActions} from './sync.object.helpers/prepare-actions';
import {
	LoadedItem,
	MaybeRemoteData,
	RemoteHandlers,
	ScopeHandlers,
	SubscriberType,
	SyncObjectType,
} from './types';
import {deepAssign} from './utils';

export function syncObject<
	StoreState extends Record<string, StoreState[keyof StoreState]>,
	Key extends keyof StoreState = keyof StoreState,
	Routes extends Record<string, Route<any, any>> = Record<string, never>,
	OtherRoutes extends Record<string, any> = Record<string, never>,
>(
	scope: GetScope<Routes, Key> | Key,
	scopeHandlers: ScopeHandlers<StoreState, Key, Routes, OtherRoutes>,
	initData?: Partial<StoreState[Key]>,
	persistData?: boolean,
	restorePreparation: (
		v: LoadedItem<StoreState[Key]>,
	) => LoadedItem<StoreState[Key]> = defRestorePreparation,
): SyncObjectType<Routes, StoreState[Key], OtherRoutes> {
	const result =
		(
			store: Store<StoreState>,
			getObjFunc: (
				value: LoadedItem<StoreState[Key]>,
			) => MaybeRemoteData<LoadedItem<StoreState[Key]>>,
		) =>
		(subscriber: SubscriberType<StoreState[Key]>) => {
			try {
				const storeName: Key =
					typeof scope === 'object' ? (scope.NAME as Key) : scope;

				// TODO: не забыть добавить в экшены
				const shouldPersistStore =
					typeof persistData === 'boolean'
						? persistData
						: typeof scope === 'object';

				const persistStorage = shouldPersistStore
					? store.local.simpleStorage()
					: undefined;

				store.cache.subscribe<MaybeRemoteData<LoadedItem<StoreState[Key]>>>(
					storeName,
					subscriber,
					getObjFunc as any,
					shouldPersistStore
						? firstSubscriptionCb<StoreState>(
								storeName,
								restorePreparation as any,
								getObjFunc as any,
								persistStorage as any,
						  )
						: undefined,
					initData,
				);
				return () => store.cache.unsubscribe(storeName, subscriber);
			} catch (err) {
				console.error(err);
			}
		};

	prepareActions<StoreState, Key, Routes, OtherRoutes>(
		result,
		scope,
		scopeHandlers,
		getUpdater<StoreState>(scope, persistData as any),
		initData,
	);

	return result as any;
}

const nothingHandler = (s) => s;

syncObject.update = {
	request: (s): LoadedItem<any> => ({
		data: s.data,
		loadingStatus: {
			...s.loadingStatus,
			isLoading: true,
		},
	}),
	success: (
		s,
		data,
		remote: {res: DataRes; route: Route},
	): LoadedItem<any> => ({
		data: {
			...s.data,
			...(remote?.res.data || data || {}),
		},
		loadingStatus: {
			error: undefined,
			isLoaded: true,
			isLoading: false,
		},
	}),
	// eslint-disable-next-line sort-keys
	failure: (
		s,
		_,
		remote: {res: ErrorOrInfo; route: Route},
	): LoadedItem<any> => ({
		data: s.data,
		loadingStatus: {
			...s.loadingStatus,
			error: remote.res,
			isLoading: false,
		},
	}),
} as RemoteHandlers | RemoteHandlers<Record<string, any>, Record<string, any>>;

syncObject.replace = {
	request: (s): LoadedItem<any> => ({
		data: s.data,
		loadingStatus: {
			...s.loadingStatus,
			isLoading: true,
		},
	}),
	success: (
		s,
		data,
		remote: {res: DataRes; route: Route},
	): LoadedItem<any> => ({
		data: remote?.res.data || data || {},
		loadingStatus: {
			error: undefined,
			isLoaded: true,
			isLoading: false,
		},
	}),
	// eslint-disable-next-line sort-keys
	failure: (
		s,
		_,
		remote: {res: ErrorOrInfo; route: Route},
	): LoadedItem<any> => ({
		data: s.data,
		loadingStatus: {
			...s.loadingStatus,
			error: remote.res,
			isLoading: false,
		},
	}),
} as RemoteHandlers | RemoteHandlers<Record<string, any>, Record<string, any>>;

syncObject.remove = {
	request: (s): LoadedItem<any> => ({
		data: s.data,
		loadingStatus: {
			...s.loadingStatus,
			isLoading: true,
		},
	}),
	success: (s, data): LoadedItem<any> => ({
		data: data || {},
		loadingStatus: {
			error: undefined,
			isLoaded: false,
			isLoading: false,
		},
	}),
	// eslint-disable-next-line sort-keys
	failure: (
		s,
		_,
		remote: {res: ErrorOrInfo; route: Route},
	): LoadedItem<any> => ({
		data: s.data,
		loadingStatus: {
			...s.loadingStatus,
			error: remote.res,
			isLoading: false,
		},
	}),
} as RemoteHandlers | RemoteHandlers<Record<string, any>, Record<string, any>>;

syncObject.nothing = {
	request: (s): LoadedItem<any> => {
		return {
			data: s.data,
			loadingStatus: {
				...s.loadingStatus,
				isLoading: true,
			},
		};
	},
	success: (s): LoadedItem<any> => {
		return {
			data: s.data,
			loadingStatus: {
				...s.loadingStatus,
				error: undefined,
				isLoading: false,
			},
		};
	},
	// eslint-disable-next-line sort-keys
	failure: (
		s,
		_,
		remote: {res: ErrorOrInfo; route: Route},
	): LoadedItem<any> => ({
		data: s.data,
		loadingStatus: {
			error: remote.res,
			isLoaded: false,
			isLoading: false,
		},
	}),
} as RemoteHandlers | RemoteHandlers<Record<string, any>, Record<string, any>>;

syncObject.deepMerge = {
	request: (s): LoadedItem<any> => ({
		data: s.data,
		loadingStatus: {
			...s.loadingStatus,
			isLoading: true,
		},
	}),
	success: (
		s,
		data,
		remote: {res: DataRes; route: Route},
	): LoadedItem<any> => ({
		data: deepAssign(s.data, remote?.res.data || data || {}),
		loadingStatus: {
			error: undefined,
			isLoaded: true,
			isLoading: false,
		},
	}),
	// eslint-disable-next-line sort-keys
	failure: (
		s,
		_,
		remote: {res: ErrorOrInfo; route: Route},
	): LoadedItem<any> => ({
		data: s.data,
		loadingStatus: {
			...s.loadingStatus,
			error: remote.res,
			isLoading: false,
		},
	}),
} as RemoteHandlers | RemoteHandlers<Record<string, any>, Record<string, any>>;

syncObject.custom = <T, D = any>(
	cb: (a: T, data: D) => T,
): RemoteHandlers | RemoteHandlers<Record<string, any>, Record<string, any>> =>
	({
		request: nothingHandler,
		success: (s: LoadedItem<T>, data): LoadedItem<T> => {
			return {
				data: cb(s.data as T, data as any),
				loadingStatus: s.loadingStatus,
			};
		},
		// eslint-disable-next-line sort-keys
		failure: nothingHandler,
	} as any);
