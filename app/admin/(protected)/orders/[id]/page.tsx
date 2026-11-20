import { notFound } from "next/navigation";
import { OrderDetailView } from "@/components/admin/OrderDetailView";
import { getMessageTemplates, getOrder, getProblemOrderCount } from "@/lib/admin/orders-data";
import { deleteOrderAction, saveMessageTemplateAction, setOrderStatusAction } from "../actions";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();
  const [problemCount, templates] = await Promise.all([
    getProblemOrderCount(order.phone, order.id),
    getMessageTemplates(),
  ]);

  return (
    <OrderDetailView
      order={order}
      problemCount={problemCount}
      printHref={`/admin/orders/${order.id}/print`}
      setStatus={setOrderStatusAction.bind(null, order.id)}
      deleteOrder={deleteOrderAction.bind(null, order.id)}
      templates={templates}
      saveTemplate={saveMessageTemplateAction}
    />
  );
}
