import {ResBase, Route} from '@storng/common';

import {FetchType} from './types';
import {getIsExpiredSoon} from './utils';

export class StoreRemote {
	private readonly prefix: string;
	private readonly apiFetch: FetchType;
	private readonly updateTokenRoute?: Route;

	constructor(apiFetch: FetchType, prefix = '', updateTokenRoute?: Route) {
		this.apiFetch = apiFetch;
		this.prefix = prefix;
		this.updateTokenRoute = updateTokenRoute;
	}

	private isUpdating = false;

	private requestsQueue: Array<{
		route: Route;
		data?: Record<string, any>;
		cb: (res?: any) => void;
	}> = [];

	public async fetch(
		getAuthToken: () => string | false,
		route: Route<any, any>,
		data?: Record<string, any>,
	): Promise<
		typeof Route extends Route<infer Req, infer Res>
			? ResBase<Res, Req>
			: ResBase
	> {
		try {
			if (route.private) {
				const accessToken = getAuthToken();
				if (!this.updateTokenRoute) {
					throw new Error(
						'Вы пытаетесь использовать маршрут, который требует авторизацию, но' +
							' ваше хранилище не содержит updateTokenRoute для обновления ключа accessToken',
					);
				}
				if (!accessToken) {
					// TODO: logout
					// в этом месте нет необходимости производить выход, т.к. если данных нет в accessToken,
					// это означает, что выход уже произведен. Ведь критерием того, что пользователь находится
					// внутри системы как раз и является наличие ключа accessToken
					return {
						message: 'Пользователь не авторизован',
						ok: false,
					};
				}

				if (this.isUpdating) {
					return await new Promise((resolve) => {
						this.requestsQueue.push({
							cb: resolve,
							data,
							route,
						});
					});
				}

				// 1. произвести проверку срока давности ключа
				const isExpiredSoon = getIsExpiredSoon(accessToken, 30);

				// 2. если ключ истекает в ближайшие x секунд или уже истек, то
				if (isExpiredSoon) {
					this.isUpdating = true;
					return await new Promise(async (resolve, reject) => {
						try {
							// 2.1. отложить выполнения запроса в очередь
							this.requestsQueue.push({
								cb: resolve,
								data,
								route,
							});

							// 2.2. выполнить обновление ключа
							await this.makeRequest(
								getAuthToken,
								this.updateTokenRoute as Route,
							);
							this.isUpdating = false;

							// 2.3. выполнить запросы из очереди с новым ключом
							this.requestsQueue.forEach(({data, route, cb}) => {
								this.makeRequest(getAuthToken, route, data)
									.then(cb)
									.catch(console.error);
							});
						} catch (err) {
							reject(err);
						}
					});
				}
			}

			return await this.makeRequest(getAuthToken, route, data);
		} catch (err) {
			return err as ResBase;
		}
	}

	private async makeRequest(
		getAuthToken: () => string | false,
		route: Route<any, any>,
		data?: Record<string, any>,
	) {
		try {
			const requestInit: Partial<RequestInit> = {};
			const accessToken = getAuthToken();
			if (route.private && accessToken) {
				requestInit.headers = {Authorization: `bearer ${accessToken}`};
			}

			const [url, init] = route.fetchParams(data, this.prefix, requestInit);
			const res = await this.apiFetch(url, init);

			return await res.json();
		} catch (err: any) {
			if (typeof err?.ok !== 'boolean') {
				return {
					message: String(err),
					ok: false,
				};
			}
			return err as ResBase;
		}
	}
}
