import { notFound } from "next/navigation";
import { OrderDetailView } from "@/components/admin/OrderDetailView";
import { getCompanyOptions } from "@/lib/admin/delivery-data";
import { getOrder, getProblemOrderCount } from "@/lib/admin/orders-data";
import { assignDeliveryCompanyAction, deleteOrderAction, saveOrderNotesAction, setOrderStatusAction } from "../actions";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();
  const [problemCount, companies] = await Promise.all([getProblemOrderCount(order.phone, order.id), getCompanyOptions(order.governorate)]);

  return (
    <OrderDetailView
      order={order}
      problemCount={problemCount}
      printHref={`/admin/orders/${order.id}/print`}
      setStatus={setOrderStatusAction.bind(null, order.id)}
      saveNotes={saveOrderNotesAction.bind(null, order.id)}
      deleteOrder={deleteOrderAction.bind(null, order.id)}
      assignCompany={assignDeliveryCompanyAction.bind(null, order.id)}
      companies={companies}
    />
  );
}
