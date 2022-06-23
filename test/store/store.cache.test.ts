import {StoreCache} from '@storng/store/src/store.cache';
import {StructureType} from '@storng/store/src/types';
import {deepAssign} from '@storng/store/src/utils';

type StoreType = {
	auth: {accessToken: string; refreshToken: string};
	profile: {image: string};
	users: ArrayLike<{email: string; id: string}>;
};

const storeWeb = new StoreCache<StoreType>('storng');

const subscriber1 = sinon.spy();
const subscriber2 = sinon.spy();

describe('StoreCache src/store.cache.ts', () => {
	it('проверяем имя', () => {
		// @ts-ignore
		expect(storeWeb.name).to.be.eq('storng');
	});

	it('проверяем, что есть structure', () => {
		// @ts-ignore
		expect(typeof storeWeb.structure).to.be.eql('object');
	});

	it('проверяем, что есть weakStore', () => {
		// @ts-ignore
		expect(typeof storeWeb.weakStore).to.be.eql('object');
	});

	describe('addItem - добавляем структуру объекта данных с пустыми начальными данными', () => {
		storeWeb.addItem('auth');

		it('после добавления можем найти ключ', () => {
			// @ts-ignore
			expect(storeWeb.structure.has('auth')).to.be.true;
		});

		it('проверяем структуру данных после добавления структурного элемента таблицы', () => {
			// @ts-ignore
			expect(storeWeb.structure.get('auth')).to.be.eql({
				initData: {
					data: {},
					loadingStatus: {
						error: undefined,
						initial: true,
						isLoaded: false,
						isLoading: true,
					},
				},
				name: 'auth',
				type: StructureType.ITEM,
			});
		});
	});

	describe('addItem - добавляем структуру объекта данных с непустыми начальными данными', () => {
		storeWeb.addItem('profile', {image: 'my-image'});

		it('после добавления можем найти ключ', () => {
			// @ts-ignore
			expect(storeWeb.structure.has('profile')).to.be.true;
		});

		it('проверяем структуру данных после добавления структурного элемента таблицы', () => {
			// @ts-ignore
			expect(storeWeb.structure.get('profile')).to.be.eql({
				initData: {
					data: {image: 'my-image'},
					loadingStatus: {
						error: undefined,
						initial: true,
						isLoaded: false,
						isLoading: true,
					},
				},
				name: 'profile',
				type: StructureType.ITEM,
			});
		});
	});

	describe('getDataKey', () => {
		it('получаем объект ключа для временных данных с пустыми начальными данными', () => {
			// @ts-ignore
			expect(storeWeb.getDataKey('auth')).to.be.eql({
				initData: {
					data: {},
					loadingStatus: {
						error: undefined,
						initial: true,
						isLoaded: false,
						isLoading: true,
					},
				},
				name: 'auth',
				type: StructureType.ITEM,
			});
		});
	});

	describe('getData', () => {
		it('получаем пустые временные данные - должны быть пустыми', () => {
			// @ts-ignore
			expect(storeWeb.getData('profile')).to.be.undefined;
		});
	});

	describe('Устанавливаем временные данные', () => {
		// @ts-ignore
		storeWeb.setData(
			'auth',
			{
				data: {accessToken: 'accessToken', refreshToken: 'refreshToken'},
				loadingStatus: {
					error: undefined,
					initial: false,
					isLoaded: true,
					isLoading: false,
				},
			},
			[],
		);

		it('    - должны быть заполненными после установки', () => {
			// @ts-ignore
			expect(Boolean(storeWeb.getData('auth'))).to.be.true;
		});

		it('    - должны быть заполненными', () => {
			// @ts-ignore
			expect(storeWeb.getData('auth')).to.be.eql({
				data: {
					data: {accessToken: 'accessToken', refreshToken: 'refreshToken'},
					loadingStatus: {
						error: undefined,
						initial: false,
						isLoaded: true,
						isLoading: false,
					},
				},
				subscribers: [],
			});
		});
	});

	describe('удаление временных данных', () => {
		// таймаут здесь нужен, т.к. weakStore удаляет данные сразу по ссылке и может сделать это раньше,
		// чем успеет выполниться проверка выше
		it('    - удаление', () => {
			// @ts-ignore
			storeWeb.deleteData('auth');

			// @ts-ignore
			expect(storeWeb.getData('auth')).to.be.undefined;
		});
	});

	describe('subscribe - подписка на изменения', () => {
		it('первый подписчик получает текущие данные', async () => {
			await storeWeb.subscribe('auth', subscriber1, undefined, () =>
				Promise.resolve(),
			);
			expect(subscriber1).to.have.been.calledWith(
				sinon.match({
					data: {},
					loadingStatus: {
						error: undefined,
						initial: true,
						isLoaded: false,
						isLoading: true,
					},
				}),
			);
		});

		it('второй подписчик получает текущие данные', async () => {
			await storeWeb.subscribe('auth', subscriber2, undefined, () =>
				Promise.resolve(),
			);
			expect(subscriber2).to.have.been.calledWith(
				sinon.match({
					data: {},
					loadingStatus: {
						error: undefined,
						initial: false,
						isLoaded: false,
						isLoading: true,
					},
				}),
			);
		});

		it('после добавления второго подписчика ссылка на первого осталась прежней', () => {
			// @ts-ignore
			expect(storeWeb.getData('auth').subscribers[0]).to.be.eq(subscriber1);
		});

		it('после добавления второго подписчика ссылка на второй верная', () => {
			// @ts-ignore
			expect(storeWeb.getData('auth').subscribers[1]).to.be.eq(subscriber2);
		});
	});

	describe('updateData - обновление данных', () => {
		const updater = (s: any) =>
			deepAssign(s, {
				data: {
					id: 'my-id',
				},
				loadingStatus: {
					isLoaded: true,
					isLoading: false,
				},
			});
		it('После обновления данных, мы видим новые данные у первого подписчика', async () => {
			await storeWeb.updateData('auth', updater, undefined, () =>
				Promise.resolve(),
			);
			expect(subscriber1)
				.to.nth(2)
				.calledWith({
					data: {
						id: 'my-id',
					},
					loadingStatus: {
						error: undefined,
						initial: false,
						isLoaded: true,
						isLoading: false,
					},
				});
			expect(subscriber2)
				.to.nth(2)
				.calledWith({
					data: {
						id: 'my-id',
					},
					loadingStatus: {
						error: undefined,
						initial: false,
						isLoaded: true,
						isLoading: false,
					},
				});
		});
	});

	describe('unsubscribe - удаление подписки на изменения', () => {
		it('удаляем одного из подписчиков', async () => {
			await storeWeb.unsubscribe('auth', subscriber1);
			// @ts-ignore
			expect(storeWeb.getData('auth').subscribers.length).to.be.eq(1);
		});

		it('удаляем последнего подписчика', async () => {
			await storeWeb.unsubscribe('auth', subscriber2);
			// @ts-ignore
			expect(storeWeb.getData('auth')).to.be.undefined;
		});
	});
});
