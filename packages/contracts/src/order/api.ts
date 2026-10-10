import type { 
  CreateOrderRequest 
} from './requests'
import type {
  CreateOrderResponse,
  DeleteOrderResponse,
  GetOrderResponse,
  GetOrdersResponse,
} from './responses'

/** Browser-facing Order Service boundary. */
export interface OrderApi {
  /** Create an errand for the authenticated requester. */
  createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse>

  /** List orders visible to the authenticated user. */
  getOrders(): Promise<GetOrdersResponse>

  /** Retrieve an order visible to the authenticated user. */
  getOrder(id: string): Promise<GetOrderResponse>

  /** Delete an eligible order owned by the authenticated requester. */
  deleteOrder(id: string): Promise<DeleteOrderResponse>
}
