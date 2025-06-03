import { useNavigate, useParams } from 'react-router-dom';
import CouponForm from './form';

const EditCouponPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const handleSuccess = () => {
    navigate('/coupons');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit Coupon</h1>
      <CouponForm onSuccess={handleSuccess} couponId={id} />
    </div>
  );
};

export default EditCouponPage; 