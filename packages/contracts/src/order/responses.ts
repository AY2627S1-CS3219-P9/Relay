import type { Order } from './models'

export type CreateOrderResponse = {
  order: Order
}

export type GetOrdersResponse = {
  orders: Order[]
}

export type GetOrderResponse = {
  order: Order
}

export type DeleteOrderResponse = undefined
