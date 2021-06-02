import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const product = cart.find((el) => el.id === productId);

      if (product) {
        await updateProductAmount({ productId, amount: product.amount + 1 });
        return;
      }

      const response = await api.get<Product>(`/products/${productId}`);

      if (response.status !== 200) return;

      setCart((state) => {
        const newState = [...state, { ...response.data, amount: 1 }];
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newState));
        return newState;
      });
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const product = cart.find((el) => el.id === productId);

      if (!product) {
        throw new Error('Erro na remoção do produto');
      }

      setCart((state) => {
        const newState = state.filter((el) => el.id !== productId);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newState));
        return newState;
      });
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const response = await api.get<Stock>(`/stock/${productId}`);

      const productStock = response.data.amount;

      if (amount > productStock) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      setCart((state) => {
        const newState = state.map((el) =>
          el.id === productId ? { ...el, amount: amount } : el
        );
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newState));
        return newState;
      });
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
