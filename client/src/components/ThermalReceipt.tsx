import { forwardRef } from "react";
import type { OrderWithDetails } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ThermalReceiptProps {
  order: OrderWithDetails;
  establishment?: {
    name: string;
    address?: string;
    phone?: string;
    cnpj?: string;
  };
}

const ThermalReceipt = forwardRef<HTMLDivElement, ThermalReceiptProps>(
  ({ order, establishment }, ref) => {
    const formatCurrency = (value: string | number) => {
      const num = typeof value === "string" ? parseFloat(value) : value;
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(num);
    };

    const formatPhone = (phone: string) => {
      if (!phone) return "";
      const cleaned = phone.replace(/\D/g, "");
      if (cleaned.length === 11) {
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
      }
      if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
      }
      return phone;
    };

    const formatAddress = () => {
      const parts: string[] = [];
      if (order.deliveryStreet) {
        let addressLine = order.deliveryStreet;
        if (order.deliveryNumber) addressLine += `, ${order.deliveryNumber}`;
        if (order.deliveryComplement) addressLine += ` - ${order.deliveryComplement}`;
        parts.push(addressLine);
      }
      if (order.deliveryNeighborhood) {
        parts.push(order.deliveryNeighborhood);
      }
      if (order.deliveryCity) {
        let cityLine = order.deliveryCity;
        if (order.deliveryZipCode) cityLine += ` - CEP: ${order.deliveryZipCode}`;
        parts.push(cityLine);
      }
      if (order.deliveryReference) {
        parts.push(`Ref: ${order.deliveryReference}`);
      }
      return parts;
    };

    const hasDeliveryAddress = order.deliveryStreet || order.deliveryNumber || order.deliveryNeighborhood;
    const addressLines = formatAddress();

    return (
      <div
        ref={ref}
        className="thermal-receipt bg-white text-black p-2"
        style={{
          width: "58mm",
          fontFamily: "monospace",
          fontSize: "12px",
          lineHeight: "1.3",
        }}
      >
        <div className="text-center mb-3">
          <h1 className="text-lg font-bold" style={{ fontSize: "16px" }}>
            {establishment?.name || "ESTABELECIMENTO"}
          </h1>
          {establishment?.address && (
            <p style={{ fontSize: "10px" }}>{establishment.address}</p>
          )}
          {establishment?.phone && (
            <p style={{ fontSize: "10px" }}>Tel: {establishment.phone}</p>
          )}
          {establishment?.cnpj && (
            <p style={{ fontSize: "10px" }}>CNPJ: {establishment.cnpj}</p>
          )}
        </div>

        <div className="border-t border-dashed border-black py-2">
          <p className="text-center font-bold" style={{ fontSize: "14px" }}>
            PEDIDO #{order.orderNumber}
          </p>
          <p className="text-center" style={{ fontSize: "10px" }}>
            {order.createdAt && format(new Date(order.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </div>

        <div className="border-t border-dashed border-black py-2">
          <p className="font-bold">CLIENTE:</p>
          <p>{order.client?.name || "Cliente"}</p>
          <p>{formatPhone(order.client?.phone || "")}</p>
        </div>

        {hasDeliveryAddress && addressLines.length > 0 && (
          <div className="border-t border-dashed border-black py-2">
            <p className="font-bold">ENDEREÇO DE ENTREGA:</p>
            {addressLines.map((line, idx) => (
              <p key={idx}>{line}</p>
            ))}
          </div>
        )}

        <div className="border-t border-dashed border-black py-2">
          <p className="font-bold mb-1">ITENS:</p>
          {order.items?.map((item, idx) => (
            <div key={idx} className="flex justify-between mb-1">
              <span>
                {item.quantity}x {item.product?.name || "Produto"}
              </span>
              <span>
                {formatCurrency(parseFloat(String(item.unitPrice)) * item.quantity)}
              </span>
            </div>
          ))}
        </div>

        {order.notes && (
          <div className="border-t border-dashed border-black py-2">
            <p className="font-bold">OBSERVAÇÕES:</p>
            <p className="italic">"{order.notes}"</p>
          </div>
        )}

        <div className="border-t border-dashed border-black py-2">
          <div className="flex justify-between text-lg font-bold">
            <span>TOTAL:</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
        </div>

        <div className="border-t border-dashed border-black py-2 text-center">
          <p style={{ fontSize: "10px" }}>Obrigado pela preferência!</p>
          <p style={{ fontSize: "10px" }}>Volte sempre!</p>
        </div>

        <style>{`
          @media print {
            .thermal-receipt {
              width: 58mm !important;
              padding: 2mm !important;
              margin: 0 !important;
            }
            @page {
              size: 58mm auto;
              margin: 0;
            }
          }
        `}</style>
      </div>
    );
  }
);

ThermalReceipt.displayName = "ThermalReceipt";

export function printThermalReceipt(order: OrderWithDetails, establishment?: ThermalReceiptProps["establishment"]) {
  const printWindow = window.open("", "_blank", "width=300,height=600");
  if (!printWindow) {
    alert("Não foi possível abrir a janela de impressão. Verifique se popups estão bloqueados.");
    return;
  }

  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(num);
  };

  const formatPhone = (phone: string) => {
    if (!phone) return "";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const formatAddress = () => {
    const parts: string[] = [];
    if (order.deliveryStreet) {
      let addressLine = order.deliveryStreet;
      if (order.deliveryNumber) addressLine += `, ${order.deliveryNumber}`;
      if (order.deliveryComplement) addressLine += ` - ${order.deliveryComplement}`;
      parts.push(addressLine);
    }
    if (order.deliveryNeighborhood) {
      parts.push(order.deliveryNeighborhood);
    }
    if (order.deliveryCity) {
      let cityLine = order.deliveryCity;
      if (order.deliveryZipCode) cityLine += ` - CEP: ${order.deliveryZipCode}`;
      parts.push(cityLine);
    }
    if (order.deliveryReference) {
      parts.push(`Ref: ${order.deliveryReference}`);
    }
    return parts;
  };

  const hasDeliveryAddress = order.deliveryStreet || order.deliveryNumber || order.deliveryNeighborhood;
  const addressLines = formatAddress();
  const createdAt = order.createdAt 
    ? format(new Date(order.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    : "";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Pedido #${order.orderNumber}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: monospace;
          font-size: 12px;
          line-height: 1.3;
          width: 58mm;
          padding: 2mm;
          background: white;
          color: black;
        }
        .header {
          text-align: center;
          margin-bottom: 3mm;
        }
        .header h1 {
          font-size: 16px;
          font-weight: bold;
        }
        .header p {
          font-size: 10px;
        }
        .section {
          border-top: 1px dashed black;
          padding: 2mm 0;
        }
        .order-number {
          text-align: center;
          font-weight: bold;
          font-size: 14px;
        }
        .order-date {
          text-align: center;
          font-size: 10px;
        }
        .label {
          font-weight: bold;
        }
        .item-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1mm;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          font-weight: bold;
          font-size: 14px;
        }
        .footer {
          text-align: center;
          font-size: 10px;
        }
        .notes {
          font-style: italic;
        }
        @page {
          size: 58mm auto;
          margin: 0;
        }
        @media print {
          body {
            width: 58mm;
            padding: 2mm;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${establishment?.name || "ESTABELECIMENTO"}</h1>
        ${establishment?.address ? `<p>${establishment.address}</p>` : ""}
        ${establishment?.phone ? `<p>Tel: ${establishment.phone}</p>` : ""}
        ${establishment?.cnpj ? `<p>CNPJ: ${establishment.cnpj}</p>` : ""}
      </div>

      <div class="section">
        <p class="order-number">PEDIDO #${order.orderNumber}</p>
        <p class="order-date">${createdAt}</p>
      </div>

      <div class="section">
        <p class="label">CLIENTE:</p>
        <p>${order.client?.name || "Cliente"}</p>
        <p>${formatPhone(order.client?.phone || "")}</p>
      </div>

      ${hasDeliveryAddress && addressLines.length > 0 ? `
        <div class="section">
          <p class="label">ENDEREÇO DE ENTREGA:</p>
          ${addressLines.map(line => `<p>${line}</p>`).join("")}
        </div>
      ` : ""}

      <div class="section">
        <p class="label">ITENS:</p>
        ${order.items?.map(item => `
          <div class="item-row">
            <span>${item.quantity}x ${item.product?.name || "Produto"}</span>
            <span>${formatCurrency(parseFloat(String(item.unitPrice)) * item.quantity)}</span>
          </div>
        `).join("") || ""}
      </div>

      ${order.notes ? `
        <div class="section">
          <p class="label">OBSERVAÇÕES:</p>
          <p class="notes">"${order.notes}"</p>
        </div>
      ` : ""}

      <div class="section">
        <div class="total-row">
          <span>TOTAL:</span>
          <span>${formatCurrency(order.total)}</span>
        </div>
      </div>

      <div class="section footer">
        <p>Obrigado pela preferência!</p>
        <p>Volte sempre!</p>
      </div>

      <script>
        window.onload = function() {
          window.print();
          setTimeout(function() {
            window.close();
          }, 500);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

export { ThermalReceipt };
