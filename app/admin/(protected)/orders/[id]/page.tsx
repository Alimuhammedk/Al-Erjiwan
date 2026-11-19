import { notFound } from "next/navigation";
import { OrderDetailView } from "@/components/admin/OrderDetailView";
import { getOrder, getProblemOrderCount } from "@/lib/admin/orders-data";
import { deleteOrderAction, saveOrderNotesAction, setOrderStatusAction } from "../actions";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();
  const problemCount = await getProblemOrderCount(order.phone, order.id);

  return (
    <OrderDetailView
      order={order}
      problemCount={problemCount}
      printHref={`/admin/orders/${order.id}/print`}
      setStatus={setOrderStatusAction.bind(null, order.id)}
      saveNotes={saveOrderNotesAction.bind(null, order.id)}
      deleteOrder={deleteOrderAction.bind(null, order.id)}
    />
  );
}
