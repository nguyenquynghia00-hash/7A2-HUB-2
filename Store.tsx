import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Trash2, Edit2, Check, X, Loader2, Package, Tag, Info, ShoppingBag, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth, storage, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, doc, addDoc, setDoc, deleteDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuthState } from 'react-firebase-hooks/auth';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  stock: number;
}

interface Order {
  id: string;
  productName: string;
  customerName: string;
  quantity: number;
  totalPrice: number;
  status: string;
  createdAt: any;
}

export const Store: React.FC = () => {
  const [user] = useAuthState(auth);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isOrdering, setIsOrdering] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Admin check
  const isAdmin = user?.email === 'nguyenquynghia00@gmail.com';

  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: 0 as number | string,
    imageUrl: 'https://picsum.photos/seed/product/400/400',
    stock: 10 as number | string
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    const qProducts = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribeProducts = onSnapshot(qProducts, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(data);
      setIsLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'products'));

    let unsubscribeOrders = () => {};
    if (isAdmin) {
      const qOrders = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
        setOrders(data);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'orders'));
    }

    return () => {
      unsubscribeProducts();
      unsubscribeOrders();
    };
  }, [isAdmin]);

  const handleAddProduct = async () => {
    if (!isAdmin || isSaving) return;
    setIsSaving(true);
    try {
      let finalImageUrl = productForm.imageUrl;
      if (imageFile) {
        const storageRef = ref(storage, `products/${Date.now()}_${imageFile.name}`);
        const snapshot = await uploadBytes(storageRef, imageFile);
        finalImageUrl = await getDownloadURL(snapshot.ref);
      }

      await addDoc(collection(db, 'products'), {
        ...productForm,
        imageUrl: finalImageUrl,
        price: Number(productForm.price) || 0,
        stock: Number(productForm.stock) || 0,
        createdAt: serverTimestamp()
      });
      setIsAddingProduct(false);
      setProductForm({ name: '', description: '', price: 0, imageUrl: 'https://picsum.photos/seed/product/400/400', stock: 10 });
      setImageFile(null);
    } catch (error) {
      console.error('Error adding product:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOrder = async () => {
    if (!user || !isOrdering || isSaving) return;
    setIsSaving(true);
    try {
      const orderData = {
        productId: isOrdering.id,
        productName: isOrdering.name,
        customerId: user.uid,
        customerName: user.displayName || 'Học sinh',
        customerEmail: user.email || '',
        quantity: quantity,
        totalPrice: isOrdering.price * quantity,
        status: 'pending',
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'orders'), orderData);
      
      // Add a notification for the admin
      await addDoc(collection(db, 'notifications'), {
        title: 'Đơn hàng mới!',
        message: `${orderData.customerName} đã đặt mua ${orderData.quantity} ${orderData.productName}.`,
        type: 'order',
        createdAt: serverTimestamp()
      });
      
      // Notify backend for email (Simulated)
      await fetch('/api/notify-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      setIsOrdering(null);
      setQuantity(1);
      setOrderSuccess(true);
      setTimeout(() => setOrderSuccess(false), 5000);
    } catch (error) {
      console.error('Error ordering:', error);
      setErrorMsg('Có lỗi xảy ra khi đặt hàng. Vui lòng thử lại sau.');
      setTimeout(() => setErrorMsg(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Đang tải cửa hàng...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Admin Section: Orders */}
      {isAdmin && orders.length > 0 && (
        <div className="bg-amber-50 rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-8 border border-amber-100">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-500 rounded-lg sm:rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-200">
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900">Đơn hàng mới ({orders.filter(o => o.status === 'pending').length})</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {orders.filter(o => o.status === 'pending').map(order => (
              <div key={order.id} className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-3xl shadow-sm border border-amber-200 flex justify-between items-start">
                <div>
                  <p className="text-[10px] sm:text-xs font-black text-amber-600 uppercase tracking-widest mb-1">Mới đặt</p>
                  <h4 className="font-bold text-sm sm:text-base text-slate-900">{order.productName}</h4>
                  <p className="text-xs sm:text-sm text-slate-500">Người đặt: <span className="font-bold text-slate-700">{order.customerName}</span></p>
                  <p className="text-xs sm:text-sm text-slate-500">Số lượng: {order.quantity} • Tổng: <span className="text-indigo-600 font-bold">{order.totalPrice.toLocaleString()}đ</span></p>
                </div>
                <button 
                  onClick={async () => await setDoc(doc(db, 'orders', order.id), { status: 'confirmed' }, { merge: true })}
                  className="bg-emerald-500 text-white p-1.5 sm:p-2 rounded-lg sm:rounded-xl hover:bg-emerald-600 transition-colors"
                >
                  <Check className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
        {isAdmin && (
          <button 
            onClick={() => setIsAddingProduct(true)}
            className="group h-full min-h-[160px] sm:min-h-[300px] border-2 sm:border-4 border-dashed border-slate-200 rounded-2xl sm:rounded-[3rem] flex flex-col items-center justify-center gap-2 sm:gap-4 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all duration-300"
          >
            <div className="w-10 h-10 sm:w-16 sm:h-16 bg-white rounded-xl sm:rounded-3xl shadow-md flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:scale-110 transition-all duration-300">
              <Plus className="w-5 h-5 sm:w-8 sm:h-8" />
            </div>
            <span className="font-black text-slate-400 group-hover:text-indigo-600 uppercase tracking-widest text-[10px] sm:text-sm transition-colors">Thêm mặt hàng</span>
          </button>
        )}

        {products.map(product => (
          <motion.div 
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl sm:rounded-[3rem] shadow-sm hover:shadow-2xl hover:shadow-indigo-100/50 border border-slate-200/60 overflow-hidden group transition-all duration-500 flex flex-col relative"
          >
            <div className="aspect-square overflow-hidden relative bg-slate-100">
              {product.imageUrl ? (
                <img 
                  src={product.imageUrl} 
                  alt={product.name} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400 group-hover:scale-110 transition-transform duration-700 ease-out">
                  <ImageIcon className="w-8 h-8 sm:w-12 sm:h-12" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="absolute top-2 sm:top-4 right-2 sm:right-4 bg-white/90 backdrop-blur-md px-2.5 sm:px-4 py-1 sm:py-2 rounded-lg sm:rounded-2xl shadow-lg border border-white/20 transform group-hover:-translate-y-1 transition-transform duration-300">
                <span className="text-indigo-600 font-black tracking-tight text-xs sm:text-base">{product.price.toLocaleString()}đ</span>
              </div>
            </div>
            <div className="p-4 sm:p-8 flex-1 flex flex-col relative bg-white">
              <div className="flex justify-between items-start mb-1.5 sm:mb-3">
                <h4 className="text-base sm:text-2xl font-black text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">{product.name}</h4>
                {isAdmin && (
                  <div className="flex gap-1 sm:gap-2 shrink-0 ml-2 sm:ml-4">
                    <button className="p-1 sm:p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md sm:rounded-xl transition-all"><Edit2 className="w-3.5 h-3.5 sm:w-[18px] sm:h-[18px]" /></button>
                    <button 
                      onClick={async () => await deleteDoc(doc(db, 'products', product.id))}
                      className="p-1 sm:p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md sm:rounded-xl transition-all"
                    ><Trash2 className="w-3.5 h-3.5 sm:w-[18px] sm:h-[18px]" /></button>
                  </div>
                )}
              </div>
              <p className="text-slate-500 text-[10px] sm:text-sm mb-3 sm:mb-8 line-clamp-2 leading-relaxed">{product.description}</p>
              <div className="mt-auto flex items-center justify-between pt-3 sm:pt-6 border-t border-slate-100">
                <div className="flex items-center gap-1 sm:gap-2 px-1.5 sm:px-3 py-0.5 sm:py-1.5 bg-slate-50 rounded-md sm:rounded-xl text-[8px] sm:text-xs font-bold text-slate-500 border border-slate-100">
                  <Package className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-500" />
                  <span>Còn: {product.stock}</span>
                </div>
                <button 
                  onClick={() => setIsOrdering(product)}
                  className="bg-slate-900 text-white px-3 sm:px-6 py-1.5 sm:py-3 rounded-lg sm:rounded-2xl font-bold hover:bg-indigo-600 transition-all shadow-md hover:shadow-xl hover:shadow-indigo-200 flex items-center gap-1 sm:gap-2 transform hover:-translate-y-1 text-[10px] sm:text-sm"
                >
                  <ShoppingCart className="w-3.5 h-3.5 sm:w-[18px] sm:h-[18px]" />
                  Mua ngay
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add Product Modal */}
      <AnimatePresence>
        {isAddingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl sm:rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-3 sm:p-6 border-b border-slate-100 bg-white flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-100 text-indigo-600 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5 font-bold" />
                  </div>
                  <h3 className="text-base sm:text-xl font-black text-slate-900">Thêm mặt hàng mới</h3>
                </div>
                <button onClick={() => setIsAddingProduct(false)} className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-lg sm:rounded-xl transition-colors text-slate-400"><X className="w-4 h-4 sm:w-5 sm:h-5" /></button>
              </div>
              <div className="p-4 sm:p-8 overflow-y-auto space-y-4 sm:space-y-8">
                
                <div className="space-y-1.5 sm:space-y-3">
                  <label className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Hình ảnh sản phẩm</label>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-6">
                    <div className="w-full sm:w-40 h-24 sm:h-40 rounded-xl sm:rounded-3xl overflow-hidden bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center relative group cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-all shrink-0">
                      {imageFile ? (
                        <img src={URL.createObjectURL(imageFile)} alt="Preview" className="w-full h-full object-cover" />
                      ) : productForm.imageUrl && productForm.imageUrl !== 'https://picsum.photos/seed/product/400/400' ? (
                        <img src={productForm.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-1 sm:gap-2 text-slate-400 group-hover:text-indigo-500 transition-colors">
                          <ImageIcon className="w-5 h-5 sm:w-8 sm:h-8" />
                          <span className="text-[10px] sm:text-xs font-bold">Tải ảnh lên</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                        <span className="text-white text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 bg-white/20 rounded-md sm:rounded-lg border border-white/30">Thay đổi</span>
                      </div>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setImageFile(e.target.files[0]);
                            // Clear URL if file is selected
                            setProductForm({ ...productForm, imageUrl: '' });
                          }
                        }}
                      />
                    </div>
                    <div className="flex-1 space-y-2 sm:space-y-3 flex flex-col justify-center">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                          <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
                        </div>
                        <input 
                          type="text"
                          value={productForm.imageUrl}
                          onChange={(e) => {
                            setProductForm({ ...productForm, imageUrl: e.target.value });
                            if (e.target.value) setImageFile(null); // Clear file if URL is entered
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg sm:rounded-2xl pl-8 sm:pl-11 pr-3 sm:pr-4 py-2 sm:py-3.5 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                          placeholder="Hoặc dán link ảnh trực tiếp..."
                        />
                      </div>
                      <div className="flex items-start gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-slate-500 bg-blue-50/50 p-2 sm:p-3 rounded-lg sm:rounded-xl border border-blue-100/50">
                        <Info className="w-3.5 h-3.5 sm:w-3.5 sm:h-3.5 text-blue-500 shrink-0 mt-0.5" />
                        <p>Tải ảnh từ máy tính hoặc dán đường dẫn ảnh. Ảnh vuông (1:1) sẽ hiển thị đẹp nhất.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 sm:space-y-3">
                  <label className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Tên sản phẩm</label>
                  <input 
                    type="text"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg sm:rounded-2xl px-3 sm:px-5 py-2 sm:py-3.5 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none font-medium"
                    placeholder="VD: Bút bi Thiên Long"
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
                  <div className="space-y-1.5 sm:space-y-3">
                    <label className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Giá (VNĐ)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                        <Tag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
                      </div>
                      <input 
                        type="number"
                        value={productForm.price}
                        onChange={(e) => setProductForm({ ...productForm, price: e.target.value === '' ? '' : parseInt(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg sm:rounded-2xl pl-8 sm:pl-11 pr-3 sm:pr-4 py-2 sm:py-3.5 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none font-medium"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5 sm:space-y-3">
                    <label className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Số lượng kho</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                        <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
                      </div>
                      <input 
                        type="number"
                        value={productForm.stock}
                        onChange={(e) => setProductForm({ ...productForm, stock: e.target.value === '' ? '' : parseInt(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg sm:rounded-2xl pl-8 sm:pl-11 pr-3 sm:pr-4 py-2 sm:py-3.5 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none font-medium"
                        placeholder="10"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 sm:space-y-3">
                  <label className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Mô tả</label>
                  <textarea 
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg sm:rounded-2xl px-3 sm:px-5 py-2 sm:py-4 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none h-20 sm:h-32 resize-none leading-relaxed"
                    placeholder="Mô tả chi tiết về sản phẩm..."
                  />
                </div>
              </div>
              <div className="p-3 sm:p-6 bg-slate-50 border-t border-slate-100 flex gap-2 sm:gap-4 sticky bottom-0 z-10">
                <button onClick={() => setIsAddingProduct(false)} className="flex-1 px-3 sm:px-6 py-2 sm:py-3.5 rounded-lg sm:rounded-2xl font-bold text-slate-600 hover:bg-slate-200 transition-all text-xs sm:text-sm">Hủy</button>
                <button 
                  onClick={handleAddProduct}
                  disabled={isSaving || !productForm.name}
                  className="flex-[2] bg-indigo-600 text-white px-3 sm:px-6 py-2 sm:py-3.5 rounded-lg sm:rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-1.5 sm:gap-2 disabled:opacity-50 disabled:shadow-none text-xs sm:text-sm"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 sm:w-5 sm:h-5 animate-spin" /> : <Check className="w-3.5 h-3.5 sm:w-5 sm:h-5" />}
                  Đăng bán sản phẩm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Order Modal */}
      <AnimatePresence>
        {isOrdering && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl sm:rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-3 sm:p-6 border-b border-slate-100 bg-white flex justify-between items-center">
                <h3 className="text-base sm:text-xl font-black text-slate-900">Xác nhận đặt hàng</h3>
                <button onClick={() => setIsOrdering(null)} className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-lg sm:rounded-xl transition-colors text-slate-400"><X className="w-4 h-4 sm:w-5 sm:h-5" /></button>
              </div>
              <div className="p-4 sm:p-8 space-y-4 sm:space-y-8 text-center">
                <div className="w-20 h-20 sm:w-32 sm:h-32 mx-auto rounded-xl sm:rounded-[2rem] overflow-hidden shadow-lg shadow-slate-200/50 mb-3 sm:mb-6 border border-slate-100">
                  {isOrdering.imageUrl ? (
                    <img src={isOrdering.imageUrl} alt={isOrdering.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400">
                      <ImageIcon className="w-6 h-6 sm:w-12 sm:h-12" />
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="text-lg sm:text-2xl font-black text-slate-900 mb-1 sm:mb-2">{isOrdering.name}</h4>
                  <p className="text-indigo-600 font-black text-sm sm:text-lg">{isOrdering.price.toLocaleString()}đ <span className="text-slate-400 font-medium text-[10px] sm:text-sm">/ sản phẩm</span></p>
                </div>
                
                <div className="bg-slate-50 p-3 sm:p-6 rounded-xl sm:rounded-[2rem] border border-slate-100">
                  <p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-2 sm:mb-4">Số lượng</p>
                  <div className="flex items-center justify-center gap-3 sm:gap-6">
                    <button 
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all font-black text-base sm:text-xl shadow-sm"
                    >-</button>
                    <span className="text-xl sm:text-3xl font-black text-slate-900 w-8 sm:w-12">{quantity}</span>
                    <button 
                      onClick={() => setQuantity(Math.min(isOrdering.stock, quantity + 1))}
                      className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all font-black text-base sm:text-xl shadow-sm"
                    >+</button>
                  </div>
                </div>

                <div className="pt-3 sm:pt-6 border-t border-slate-100 flex items-end justify-between">
                  <p className="text-[10px] sm:text-sm font-black text-slate-400 uppercase tracking-widest">Tổng cộng</p>
                  <p className="text-xl sm:text-4xl font-black text-indigo-600 tracking-tight">{(isOrdering.price * quantity).toLocaleString()}đ</p>
                </div>
              </div>
              <div className="p-3 sm:p-6 bg-slate-50 border-t border-slate-100 flex gap-2 sm:gap-4">
                <button 
                  onClick={handleOrder}
                  disabled={isSaving}
                  className="flex-1 bg-slate-900 text-white px-4 sm:px-6 py-2.5 sm:py-4 rounded-lg sm:rounded-2xl font-bold hover:bg-indigo-600 transition-all shadow-lg shadow-slate-200 flex items-center justify-center gap-1.5 sm:gap-2 disabled:opacity-50 text-xs sm:text-base"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 sm:w-5 sm:h-5 animate-spin" /> : <ShoppingCart className="w-3.5 h-3.5 sm:w-5 sm:h-5" />}
                  Xác nhận mua
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Order Success Toast */}
      <AnimatePresence>
        {orderSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-3 sm:px-6 py-2.5 sm:py-4 rounded-lg sm:rounded-2xl shadow-2xl flex items-center gap-2 sm:gap-3 border border-slate-700 max-w-[90vw] w-max"
          >
            <div className="w-5 h-5 sm:w-8 sm:h-8 bg-emerald-500 rounded-full flex items-center justify-center shrink-0">
              <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <span className="font-medium text-[10px] sm:text-sm">Đặt hàng thành công! Admin đã nhận được thông báo.</span>
          </motion.div>
        )}
        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-red-600 text-white px-3 sm:px-6 py-2.5 sm:py-4 rounded-lg sm:rounded-2xl shadow-2xl flex items-center gap-2 sm:gap-3 max-w-[90vw] w-max"
          >
            <X className="w-3.5 h-3.5 sm:w-5 sm:h-5 shrink-0" />
            <span className="font-bold text-[10px] sm:text-sm">{errorMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
