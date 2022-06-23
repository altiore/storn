import React, {useCallback, useEffect, useMemo, useState} from 'react';

import {Store, SubsObj} from '@storng/store';

import {getLoading} from './func-data/maybe-remote.data';
import {getObjFunc} from './get.func-data';

interface IProps<T extends Record<string, T[keyof T]>> {
	store: Store<T>;
	selectors: any;
	actions: any;
	component: any;
	componentProps: any;
}

const DEF_PROPS = {};

export const ConnectComponent = <T extends Record<string, T[keyof T]>>({
	actions = DEF_PROPS,
	component: Component,
	componentProps = DEF_PROPS,
	selectors,
	store,
}: IProps<T>): JSX.Element => {
	const [state, setState] = useState(
		Object.keys(selectors || {}).reduce<any>((res, cur) => {
			res[cur] = getLoading();
			return res;
		}, {}),
	);

	const prepActions = useMemo(() => {
		return Object.keys(actions || {}).reduce<any>((res, cur) => {
			res[cur] = actions[cur](store, getObjFunc);
			return res;
		}, {});
	}, []);

	const updateState = useCallback(
		(propName: string) => (value: any) => {
			setState((s: any) => {
				const newState = {
					...s,
					[propName]: value,
				};
				return newState;
			});
		},
		[],
	);

	useEffect(() => {
		const subscribers: any[] = [];
		if (selectors) {
			Object.entries(
				selectors as {
					[K in string]: (store: any, prepareData: any) => SubsObj<any>;
				},
			).map(([propName, syncObj]) => {
				const unsubscribe = syncObj(store, getObjFunc)(updateState(propName));
				subscribers.push(unsubscribe);
			});
		}

		return () => {
			subscribers.forEach((unsubscribe) => unsubscribe());
		};
	}, []);

	return <Component {...prepActions} {...state} {...componentProps} />;
};
