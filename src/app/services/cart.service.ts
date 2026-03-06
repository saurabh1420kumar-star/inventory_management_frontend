import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Auth } from './auth';

export interface Product {
  id: number;
  name: string;
  quantity: number;
  sku?: string;
  description?: string;
  active?: boolean;
  unit?: string;
  price?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CartItem extends Product {
  cartQuantity: number;
  subtotal: number;
}

export interface CartItemPayload {
  itemId: string;
  quantity: number;
  name: string;
  sku: string;
  price: number;
  imageUrl?: string;
  active: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private finishedProductsUrl = `${environment.productsUrl}/finished-products`;
  private cartApiUrl = `${environment.apiUrl}/cart`;
  
  private cartItems = new BehaviorSubject<CartItem[]>(this.getLocalCart());
  public cart$ = this.cartItems.asObservable();

  constructor(
    private http: HttpClient,
    private auth: Auth
  ) {
    // Load cart from localStorage on init
    const savedCart = this.getLocalCart();
    if (savedCart.length > 0) {
      this.cartItems.next(savedCart);
    }
  }

  // Get all finished products
  getFinishedProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(this.finishedProductsUrl);
  }

  // Add product to cart via API
  addToCartAPI(distributorId: string | number, items: CartItemPayload[]): Observable<any> {
    const url = `${this.cartApiUrl}/items?distributorId=${distributorId}`;
    const token = this.auth.getToken();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    });
    return this.http.post<any>(url, items, { headers });
  }

  // Add product to cart (local)
  addToCart(product: Product, quantity: number): void {
    const currentCart = this.cartItems.value;
    const existingItem = currentCart.find(item => item.id === product.id);

    if (existingItem) {
      existingItem.cartQuantity += quantity;
      existingItem.subtotal = existingItem.cartQuantity * (existingItem.price || 0);
    } else {
      const cartItem: CartItem = {
        ...product,
        cartQuantity: quantity,
        subtotal: quantity * (product.price || 0)
      };
      currentCart.push(cartItem);
    }

    this.cartItems.next([...currentCart]);
    this.saveCartToLocalStorage();
  }

  // Remove from cart
  removeFromCart(productId: number): void {
    const currentCart = this.cartItems.value.filter(item => item.id !== productId);
    this.cartItems.next(currentCart);
    this.saveCartToLocalStorage();
  }

  // Update quantity
  updateQuantity(productId: number, quantity: number): void {
    const currentCart = this.cartItems.value;
    const item = currentCart.find(i => i.id === productId);
    
    if (item) {
      item.cartQuantity = quantity;
      item.subtotal = quantity * (item.price || 0);
      this.cartItems.next([...currentCart]);
      this.saveCartToLocalStorage();
    }
  }

  // Clear cart
  clearCart(): void {
    this.cartItems.next([]);
    localStorage.removeItem('distributorCart');
  }

  // Get cart total
  getCartTotal(): number {
    return this.cartItems.value.reduce((total, item) => total + item.subtotal, 0);
  }

  // Get cart count
  getCartCount(): number {
    return this.cartItems.value.reduce((count, item) => count + item.cartQuantity, 0);
  }

  // Save cart to localStorage
  private saveCartToLocalStorage(): void {
    localStorage.setItem('distributorCart', JSON.stringify(this.cartItems.value));
  }

  // Get cart from localStorage
  private getLocalCart(): CartItem[] {
    const saved = localStorage.getItem('distributorCart');
    return saved ? JSON.parse(saved) : [];
  }

  // Place order via the correct API:
  // POST /cart/placeOrder?distributorId=<id>  body: CartItemPayload[]
  placeOrder(distributorId: string | number, items: CartItemPayload[]): Observable<any> {
    const url = `${this.cartApiUrl}/placeOrder?distributorId=${distributorId}`;
    const token = this.auth.getToken();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    });
    return this.http.post<any>(url, items, { headers });
  }
}
