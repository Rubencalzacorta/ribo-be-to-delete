#Clasificación de cronograma de pagos:

1. DISBURSTMENT
Momento en que el dinero fue desembolsado
2. DUE
Todos lo pagos que deban pagarse en el presente mes
3. OVERDUE
Todos los pagos que tengan un retraso de mas de 7 dias
4. PAID
Todos los pagos que se han recibido sobre los recibos de cobro
5. PENDING
Todos los pagos que tienen fecha superior al mes corriente
6. OUTSTANDING  (Pendiente por implementar)
Todos los pagos que no sean iguales o superiores al monto de intereses ó capital.
Tiene una logina adicional ya que hay dos posibilidades.
1) recalcular la totalidad de los pagos basado en el monto restante.
2) aumentar el pago final
Adicional a esto, si el cronograma fue recalculado se debe transformar el status a 'PAID', si no, mantener el status hasta que se complete el pago y cobrar mora.

