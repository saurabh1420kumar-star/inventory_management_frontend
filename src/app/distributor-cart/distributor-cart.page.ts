import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  cartOutline,
  searchOutline,
  addOutline,
  closeOutline,
  trashOutline,
  checkmarkOutline,
  cubeOutline,
  pricetagOutline,
  gridOutline,
  personOutline,
  appsOutline
} from 'ionicons/icons';
import { CartService, Product, CartItem, CartItemPayload, PlaceOrderRequest } from '../services/cart.service';
import { Auth } from '../services/auth';

@Component({
  selector: 'app-distributor-cart',
  templateUrl: './distributor-cart.page.html',
  styleUrls: ['./distributor-cart.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
  ],
  standalone: true,
})
export class DistributorCartPage implements OnInit {
  availableProducts: Product[] = [];
  filteredProducts: Product[] = [];
  cartItems: CartItem[] = [];
  searchQuery: string = '';
  selectedProduct: Product | null = null;
  
  showProductModal: boolean = false;
  showCheckoutModal: boolean = false;
  isLoading: boolean = false;
  
  quantityToAdd: number = 1;
  orderForm!: FormGroup;

  cartTotal: number = 0;
  cartCount: number = 0;

  // Distributor ID for API calls (login response userId = distributorId)
  distributorId: string | number | null = null;

  // Current cart ID from API responses
  currentCartId: number | null = null;

  // Cart modal open state
  showCartModal: boolean = false;

  // Make Math available in template
  Math = Math;

  constructor(
    private fb: FormBuilder,
    private cartService: CartService,
    private modalCtrl: ModalController,
    private auth: Auth,
    private router: Router
  ) {
    addIcons({
      'cart-outline': cartOutline,
      'search-outline': searchOutline,
      'add-outline': addOutline,
      'close-outline': closeOutline,
      'trash-outline': trashOutline,
      'checkmark-outline': checkmarkOutline,
      'cube-outline': cubeOutline,
      'pricetag-outline': pricetagOutline,
      'grid-outline': gridOutline,
      'person-outline': personOutline,
      'apps-outline': appsOutline
    });
  }

  ngOnInit() {
    this.initializeForm();
    this.getDistributorId();
    this.fetchFinishedProducts();
    this.subscribeToCart();
  }

  getDistributorId() {
    // Login response userId IS the distributor entity ID
    this.distributorId = this.auth.getUserId();
    console.log('Distributor ID:', this.distributorId);
  }

  initializeForm() {
    this.orderForm = this.fb.group({
      deliveryAddress: ['', [Validators.required]]
    });
  }

  subscribeToCart() {
    this.cartService.cart$.subscribe(items => {
      this.cartItems = items;
      this.cartTotal = this.cartService.getCartTotal();
      this.cartCount = this.cartService.getCartCount();
    });
  }

  fetchFinishedProducts() {
    this.isLoading = true;
    this.cartService.getFinishedProducts().subscribe({
      next: (products) => {
        this.availableProducts = products;
        this.filteredProducts = [...products];
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load products', err);
        this.isLoading = false;
      }
    });
  }

  onSearchChange(event: any) {
    this.searchQuery = event.detail.value?.toLowerCase() || '';

    if (!this.searchQuery) {
      this.filteredProducts = [...this.availableProducts];
      return;
    }

    this.filteredProducts = this.availableProducts.filter(product =>
      product.name.toLowerCase().includes(this.searchQuery)
    );
  }

  openProductModal(product: Product) {
    this.selectedProduct = product;
    this.quantityToAdd = 1;
    this.showProductModal = true;
  }

  closeProductModal() {
    this.showProductModal = false;
    this.selectedProduct = null;
    this.quantityToAdd = 1;
  }

  addProductToCart() {
    if (this.selectedProduct && this.quantityToAdd > 0) {
      // Prepare the item payload for API
      const productSku = this.selectedProduct.sku || this.selectedProduct.id.toString();
      const itemPayload: CartItemPayload = {
        itemId: productSku,
        quantity: this.quantityToAdd,
        name: this.selectedProduct.name,
        sku: productSku,
        price: this.selectedProduct.price || 0,
        imageUrl: undefined,
        active: true
      };

      // Call API to add item to cart
      this.isLoading = true;
      this.cartService.addToCartAPI(this.distributorId || 0, [itemPayload]).subscribe({
        next: (response) => {
          console.log('Item added to cart via API:', response);
          // Store the cart ID from response for later use
          this.currentCartId = response?.id || response?.cartId || null;
          console.log('Stored currentCartId:', this.currentCartId);
          // Also add to local cart for UI display
          this.cartService.addToCart(this.selectedProduct!, this.quantityToAdd);
          this.closeProductModal();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Failed to add item to cart', err);
          const msg = err?.error?.message || err?.error?.error || JSON.stringify(err?.error) || 'Please try again.';
          alert('Failed to add item to cart: ' + msg);
          this.isLoading = false;
        }
      });
    }
  }

  removeFromCart(productId: number) {
    this.cartService.removeFromCart(productId);
    this.syncCartWithBackend();
  }

  updateCartQuantity(productId: number, quantity: number) {
    if (quantity > 0) {
      this.cartService.updateQuantity(productId, quantity);
      this.syncCartWithBackend();
    } else {
      this.removeFromCart(productId);
    }
  }

  // Sync local cart with backend via edit API
  syncCartWithBackend() {
    if (!this.distributorId || !this.currentCartId) {
      console.log('Cannot sync: distributorId or currentCartId missing');
      return;
    }

    // Convert cart items to API payload (matching addToCart format)
    const items = this.cartItems.map(item => ({
      itemId: item.sku || item.id?.toString() || '',
      quantity: item.cartQuantity,
      name: item.name || '',
      sku: item.sku || item.id?.toString() || '',
      price: item.price || 0,
      imageUrl: '',
      active: true
    }));

    console.log('=== SYNC CART PAYLOAD ===');
    console.log('Cart ID:', this.currentCartId);
    console.log('Distributor ID:', this.distributorId);
    console.log('Items Payload:', JSON.stringify(items, null, 2));
    console.log('Full Request URL: PUT /api/cart/' + this.currentCartId + '/edit');
    console.log('=======================');

    this.cartService.editCart(this.currentCartId, items).subscribe({
      next: () => {
        console.log('✓ Cart synced with backend successfully');
      },
      error: (err) => {
        console.error('✗ Failed to sync cart with backend:', err);
      }
    });
  }

  openCheckoutModal() {
    if (this.cartItems.length === 0) {
      alert('Your cart is empty');
      return;
    }
    this.showCheckoutModal = true;
  }

  // Open cart modal and fetch active cart from backend API
  openCartModal() {
    if (!this.distributorId) {
      alert('Distributor ID not found. Please log in again.');
      return;
    }

    this.isLoading = true;
    this.cartService.getDistributorActiveCart(this.distributorId).subscribe({
      next: (response) => {
        console.log('Distributor active cart response:', response);
        // Store cart ID from response
        const cartData = response?.data || response;
        this.currentCartId = cartData?.id || cartData?.cartId || null;
        console.log('Active cart ID:', this.currentCartId);
        this.isLoading = false;
        this.showCartModal = true;
      },
      error: (err) => {
        console.error('Failed to fetch active cart', err);
        this.isLoading = false;
        this.showCartModal = true;
      }
    });
  }

  closeCheckoutModal() {
    this.showCheckoutModal = false;
    this.orderForm.reset();
  }

  submitOrder() {
    if (this.orderForm.invalid) {
      Object.keys(this.orderForm.controls).forEach(key => {
        this.orderForm.get(key)?.markAsTouched();
      });
      return;
    }

    if (!this.distributorId) {
      alert('Distributor ID not found. Please log in again.');
      return;
    }

    this.isLoading = true;

    console.log('=== SUBMIT ORDER START ===');
    console.log('currentCartId:', this.currentCartId);
    console.log('distributorId:', this.distributorId);

    // Use stored cart ID if available, otherwise fetch from API
    if (this.currentCartId) {
      console.log('Using stored currentCartId:', this.currentCartId);
      this.placeOrderWithCartId(this.currentCartId);
    } else {
      // Fallback: fetch cart from API
      this.cartService.getCart(this.distributorId).subscribe({
        next: (cartResponse) => {
          console.log('Cart API response:', cartResponse);
          const cartData = cartResponse?.data || cartResponse?.cart || cartResponse;
          const cartId = cartData?.id || cartData?.cartId || 0;
          
          if (!cartId) {
            console.error('No cartId found in response:', cartResponse);
            alert('Cart not found. Please add items to cart first.');
            this.isLoading = false;
            return;
          }

          this.placeOrderWithCartId(cartId);
        },
        error: (err) => {
          console.error('Failed to fetch cart', err);
          alert('Failed to fetch cart. Please try again.');
          this.isLoading = false;
        }
      });
    }
  }

  private placeOrderWithCartId(cartId: number) {
    const orderPayload: PlaceOrderRequest = {
      cartId: cartId,
      address: this.orderForm.value.deliveryAddress || ''
    };

    console.log('=== PLACE ORDER DEBUG ===');
    console.log('Distributor ID:', this.distributorId);
    console.log('Cart ID:', cartId);
    console.log('Order Payload:', JSON.stringify(orderPayload));

    this.cartService.placeOrder(this.distributorId!, orderPayload).subscribe({
      next: (response) => {
        console.log('=== ORDER PLACED SUCCESSFULLY ===');
        console.log('Response:', response);
        alert('Order placed successfully!');
        this.cartService.clearCart();
        this.currentCartId = null; // Reset cart ID after successful order
        this.closeCheckoutModal();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('=== ORDER FAILED ===');
        console.error('Error object:', err);
        console.error('Error status:', err?.status);
        console.error('Error body:', JSON.stringify(err?.error));
        const msg = err?.error?.message || err?.error?.error || 'Please try again.';
        alert('Failed to place order: ' + msg);
        this.isLoading = false;
      }
    });
  }

  clearCart() {
    if (confirm('Are you sure you want to clear your cart?')) {
      this.cartService.clearCart();
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getErrorMessage(fieldName: string): string {
    const control = this.orderForm.get(fieldName);
    if (control?.hasError('required')) {
      return `${fieldName.replace(/([A-Z])/g, ' $1')} is required`;
    }
    return '';
  }

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }
}
