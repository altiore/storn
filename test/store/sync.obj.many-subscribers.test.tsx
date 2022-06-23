import React, {useCallback} from 'react';

import {MaybeRemoteData} from '@storng/store';
import {connect} from '@storng/store/src/react';
import {StoreProvider} from '@storng/store/src/react/store.provider';

import {getStore} from './storage';
import {auth} from './storage/auth';
import {StoreType} from './storage/store.type';

const renderSpy = sinon.spy();

const STORE_NAME = 'sync.obj.test.tsx';

const store = getStore(STORE_NAME);

interface MyComponentProps {
	auth: MaybeRemoteData<StoreType['auth_public']>;
	registerConfirm: any;
}

const MyComponent = ({auth, registerConfirm}: MyComponentProps) => {
	const onClick = useCallback(async () => {
		await registerConfirm({
			accessToken: 'accessToken',
		});
	}, [registerConfirm]);

	renderSpy();
	return auth<JSX.Element>({
		correct: <p onClick={onClick}>correct</p>,
		failure: <p onClick={onClick}>failure</p>,
		loading: <p onClick={onClick}>loading</p>,
		nothing: <p onClick={onClick}>nothing</p>,
	});
};

const s = {
	auth,
} as any;

const a = {
	registerConfirm: auth.registerConfirm,
} as any;

const Wrapped = connect(MyComponent, s, a) as any;

describe('sync.object.ts', () => {
	let root: any;

	before(async () => {
		await store.remove(STORE_NAME);
		root = getRoot();
	});

	after(() => {
		const el = document.getElementById('root');
		if (el) {
			el.remove();
		}
	});

	it('первая генерация компонента', async () => {
		await act(async (render) => {
			await render(
				<StoreProvider store={store}>
					<Wrapped />
					<Wrapped />
					<Wrapped />
				</StoreProvider>,
				root,
			);
		});

		expect(root?.innerHTML).to.equal(
			'<p>loading</p><p>loading</p><p>loading</p>',
		);
	});

	it('вторая генерация', async () => {
		await wait(0.3);

		expect(root?.innerHTML).to.equal(
			'<p>nothing</p><p>nothing</p><p>nothing</p>',
		);
	});

	it('обновляем данные', async () => {
		await act(() => {
			const p = document.getElementsByTagName('p');
			p[0].click();
		});
		await wait(1.3);

		expect(root?.innerHTML).to.equal(
			'<p>correct</p><p>correct</p><p>correct</p>',
		);
	});
});
