# Serbellito

Prototipo de Serbellito para Distribuidora La Central, una bodega en Guadalajara. La interfaz corre por completo en el navegador: un solo estado para el chat, la bandeja de atención, los bancos y las facturas. No hay backend, autenticación, conexión bancaria ni consulta real al SAT.

Empresa de demostración. Los PDF dicen **MUESTRA · SIN VALIDEZ OFICIAL**.

## Cómo correr la demo

```bash
npm install
npm run dev
```

Abre la URL que imprime Vite, por defecto [http://localhost:5173](http://localhost:5173).

Para generar la versión de producción:

```bash
npm run build
npm run preview
```

Los cambios se guardan en `localStorage`. **Reiniciar demo** pide confirmación y vuelve al estado inicial.

## Probar la conciliación

1. En Inicio, abre **Empaques de Occidente · $18,560** con **Revisar coincidencia**.
2. Revisa la transferencia de $18,560, A-184 por $12,000 y A-191 por $6,560. La diferencia es $0. Pulsa **Sí, pagué las dos**.
3. Cierra el panel. El pendiente original desaparece y aparece **Falta el complemento de A-191**. En el chat, pregunta «¿Cuánto le debo a Empaques de Occidente?». El saldo es $0 y el complemento pendiente no suma deuda.
4. Abre A-191 y pulsa **Simular llegada del complemento**. El pendiente se quita.
5. En el movimiento, **Deshacer conciliación** devuelve el saldo a $18,560 y la coincidencia a la bandeja.

El archivo de ejemplo está en `public/ejemplos/estado-de-cuenta-ejemplo.csv`. En Bancos, **Usar archivo de ejemplo** lo importa. Si lo subes otra vez, los movimientos ya registrados se excluyen.

También puedes escribir: «Dame mi constancia», «Dame mi opinión de cumplimiento», «¿Qué pagos hice sin factura?» y «Quiero revisar mis pendientes».
