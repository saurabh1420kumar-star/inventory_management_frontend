import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  cartOutline,
  searchOutline,
  addOutline,
  closeOutline,
  trashOutline,
  checkmarkOutline,
  cubeOutline,
  pricetagOutline
} from 'ionicons/icons';
import { CartService, Product, CartItem, CartItemPayload } from '../services/cart.service';
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

  // Cart modal open state
  showCartModal: boolean = false;

  // Make Math available in template
  Math = Math;

  constructor(
    private fb: FormBuilder,
    private cartService: CartService,
    private modalCtrl: ModalController,
    private auth: Auth
  ) {
    addIcons({
      'cart-outline': cartOutline,
      'search-outline': searchOutline,
      'add-outline': addOutline,
      'close-outline': closeOutline,
      'trash-outline': trashOutline,
      'checkmark-outline': checkmarkOutline,
      'cube-outline': cubeOutline,
      'pricetag-outline': pricetagOutline
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
  }

  updateCartQuantity(productId: number, quantity: number) {
    if (quantity > 0) {
      this.cartService.updateQuantity(productId, quantity);
    }
  }

  openCheckoutModal() {
    if (this.cartItems.length === 0) {
      alert('Your cart is empty');
      return;
    }
    this.showCheckoutModal = true;
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

    // Build the payload array expected by POST /cart/placeOrder?distributorId=<id>
    const orderPayload: CartItemPayload[] = this.cartItems.map(item => ({
      itemId: (item.sku || item.id.toString()),
      quantity: item.cartQuantity,
      name: item.name,
      sku: (item.sku || item.id.toString()),
      price: item.price || 0,
      imageUrl: '',
      active: true
    }));

    this.isLoading = true;
    this.cartService.placeOrder(this.distributorId, orderPayload).subscribe({
      next: (response) => {
        alert('Order placed successfully!');
        this.cartService.clearCart();
        this.closeCheckoutModal();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to place order', err);
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
}
