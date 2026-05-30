// const { getConnection, sql } = require('../config/db');

// // 1. Listar el Inventario / Catálogo (Actualizado con nuevas columnas)
// const getInventario = async (req, res) => {
//     try {
//         const pool = await getConnection();
//         const result = await pool.request().query(`
//             SELECT 
//                 ProductoID AS id, 
//                 Nombre AS producto, 
//                 StockActual AS stock, 
//                 PrecioVenta AS precio,
//                 PrecioCompra,
//                 ModeloBase,
//                 Atributo,
//                 Activo -- ¡Agregamos esto y quitamos el WHERE!
//             FROM Inventario 
//         `);
//         res.json(result.recordset);
//     } catch (error) {
//         res.status(500).json({ mensaje: "Error interno al listar los productos." });
//     }
// };
// // 2. Crear Nuevo Producto (Blindado contra nulos)
// const createProducto = async (req, res) => {
//     const { nombre, stock, precioCompra, precioVenta, modeloBase, atributo } = req.body;
    
//     const codigoGenerado = "PRD-" + Date.now().toString().slice(-6);

//     try {
//         const pool = await getConnection();
//         await pool.request()
//             .input('CategoriaID', sql.Int, 1) 
//             .input('Codigo', sql.VarChar, codigoGenerado) 
//             .input('Nombre', sql.VarChar, nombre)
//             .input('Descripcion', sql.VarChar, 'Sin descripción') 
//             .input('Unidad', sql.VarChar, 'UND') 
//             .input('StockActual', sql.Int, stock)
//             .input('StockMinimo', sql.Int, 5) 
//             .input('PrecioCompra', sql.Decimal(10, 2), precioCompra)
//             .input('PrecioVenta', sql.Decimal(10, 2), precioVenta)
//             .input('ModeloBase', sql.VarChar, modeloBase || null)
//             .input('Atributo', sql.VarChar, atributo || null)
//             .query(`
//                 INSERT INTO Inventario (
//                     CategoriaID, Codigo, Nombre, Descripcion, Unidad, 
//                     StockActual, StockMinimo, PrecioCompra, PrecioVenta, 
//                     ModeloBase, Atributo, Activo, FechaCreacion
//                 )
//                 VALUES (
//                     @CategoriaID, @Codigo, @Nombre, @Descripcion, @Unidad, 
//                     @StockActual, @StockMinimo, @PrecioCompra, @PrecioVenta, 
//                     @ModeloBase, @Atributo, 1, GETDATE()
//                 )
//             `);
//         res.json({ success: true, mensaje: "Producto registrado exitosamente." });
//     } catch (error) {
//         console.error("Error al crear producto:", error);
//         res.status(500).json({ success: false, mensaje: "Error al registrar el producto." });
//     }
// };

// // 3. Ajuste de Stock (Kardex)
// const ajustarStock = async (req, res) => {
//     const { idProducto, tipoAjuste, cantidad, motivo, idUsuario } = req.body;
//     try {
//         const pool = await getConnection();
//         const operador = tipoAjuste === 'ENTRADA' ? '+' : '-';

//         await pool.request()
//             .input('ProductoID', sql.Int, idProducto)
//             .input('Cantidad', sql.Int, cantidad)
//             .query(`UPDATE Inventario SET StockActual = StockActual ${operador} @Cantidad WHERE ProductoID = @ProductoID`);

//         await pool.request()
//             .input('ProductoID', sql.Int, idProducto)
//             .input('UsuarioID', sql.Int, idUsuario)
//             .input('TipoMovimiento', sql.VarChar, tipoAjuste)
//             .input('Cantidad', sql.Int, cantidad)
//             .input('Motivo', sql.VarChar, motivo)
//             .query(`
//                 INSERT INTO HistorialInventario (ProductoID, UsuarioID, TipoMovimiento, Cantidad, Motivo, FechaMovimiento)
//                 VALUES (@ProductoID, @UsuarioID, @TipoMovimiento, @Cantidad, @Motivo, GETDATE())
//             `);

//         res.json({ success: true, mensaje: "Ajuste de stock realizado correctamente." });
//     } catch (error) {
//         console.error("Error en ajuste de stock:", error);
//         res.status(500).json({ success: false, mensaje: "Error al procesar el ajuste." });
//     }
// };

// // 4. Ver Historial (Kardex)
// const getKardex = async (req, res) => {
//     const { id } = req.params;
//     try {
//         const pool = await getConnection();
//         const result = await pool.request()
//             .input('ProductoID', sql.Int, id)
//             .query(`
//                 SELECT 
//                     FORMAT(h.FechaMovimiento, 'dd/MM/yyyy HH:mm') AS fecha, 
//                     u.NombreUsuario AS usuario, 
//                     h.TipoMovimiento AS tipo, 
//                     h.Cantidad AS cant, 
//                     h.Motivo AS motivo
//                 FROM HistorialInventario h
//                 INNER JOIN Usuario u ON h.UsuarioID = u.UsuarioID
//                 WHERE h.ProductoID = @ProductoID
//                 ORDER BY h.FechaMovimiento DESC
//             `);
//         res.json(result.recordset);
//     } catch (error) {
//         res.status(500).json({ mensaje: "Error al consultar el historial." });
//     }
// };

// // 5. Actualizar Datos Comerciales (NUEVO)
// const updateProducto = async (req, res) => {
//     const { id } = req.params;
//     const { nombre, precioCompra, precioVenta, modeloBase, atributo } = req.body;
//     try {
//         const pool = await getConnection();
//         await pool.request()
//             .input('ProductoID', sql.Int, id)
//             .input('Nombre', sql.VarChar, nombre)
//             .input('PrecioCompra', sql.Decimal(10, 2), precioCompra)
//             .input('PrecioVenta', sql.Decimal(10, 2), precioVenta)
//             .input('ModeloBase', sql.VarChar, modeloBase || null)
//             .input('Atributo', sql.VarChar, atributo || null)
//             .query(`
//                 UPDATE Inventario 
//                 SET Nombre = @Nombre, 
//                     PrecioCompra = @PrecioCompra, 
//                     PrecioVenta = @PrecioVenta,
//                     ModeloBase = @ModeloBase,
//                     Atributo = @Atributo
//                 WHERE ProductoID = @ProductoID
//             `);
//         res.json({ success: true, mensaje: "Datos del catálogo actualizados con éxito." });
//     } catch (error) {
//         console.error("Error al actualizar producto:", error);
//         res.status(500).json({ success: false, mensaje: "Error al actualizar el producto." });
//     }
// };

// // 6. Desactivar Producto (Soft Delete)
// const desactivarProducto = async (req, res) => {
//     const { id } = req.params;
//     try {
//         const pool = await getConnection();
//         await pool.request()
//             .input('ProductoID', sql.Int, id)
//             .query(`UPDATE Inventario SET Activo = 0 WHERE ProductoID = @ProductoID`);
            
//         res.json({ success: true, mensaje: "El producto ha sido descontinuado correctamente." });
//     } catch (error) {
//         console.error("Error al desactivar producto:", error);
//         res.status(500).json({ success: false, mensaje: "Error al intentar descontinuar el producto." });
//     }
// };
// // 7. Reactivar Producto
// const reactivarProducto = async (req, res) => {
//     const { id } = req.params;
//     try {
//         const pool = await getConnection();
//         await pool.request()
//             .input('ProductoID', sql.Int, id)
//             .query(`UPDATE Inventario SET Activo = 1 WHERE ProductoID = @ProductoID`);
            
//         res.json({ success: true, mensaje: "Producto reactivado. Vuelve a estar en venta." });
//     } catch (error) {
//         res.status(500).json({ success: false, mensaje: "Error al reactivar." });
//     }
// };

// module.exports = { getInventario, createProducto, ajustarStock, getKardex, updateProducto, desactivarProducto, reactivarProducto };

