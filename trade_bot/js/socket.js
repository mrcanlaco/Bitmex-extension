var baseUrl = 'testnet.bitmex.com';
//Open socket tới Bitmex
var botSocket = new WebSocket("wss://"+baseUrl+"/realtime?subscribe=order:XBTUSD,instrument:XBTUSD");
//Khai báo các biến cần thực thi
var extStoploss, extStoplimit;
//Danh sách order khi thực hiện lệnh trên extensions
var extOrders = {};

//Khởi tạo
$(document).ready(function(e)
{
	//Chạy hàm chèn dashboard tool vào phía dưới màn hình
	extNav();
	
	//Kiểm tra không có cookie thì gửi lệnh qua background để mở cookie
	if(!getCookie('connect.sid') || !getCookie('u')){
		chrome.runtime.sendMessage({mes:'fix cookie'});	
	}

});	

//Hàm lắng nghe thông tin từ Bitmex trả về
botSocket.onmessage = function(event)
{
    result = JSON.parse(event.data);
  	
	//Nếu có sự thay đổi về giá
  	/*if(result.table == 'instrument' && result.action == 'update')
  	{
		var data = result.data[0];
		if(data.lastPrice && progress === true)
		{
		}
  	}*/
  
   //Nếu có sự thay đổi về Order
 	if(result.table == 'order' && result.action == 'update')
	{
			
		var data  =  result.data[0];
		
		//Check trạng thái của order
		if(data.ordStatus == 'Filled')
		{
			var orderId = data.orderID;
			
			//Delay 1 giây rồi so sánh với order id đã mua trước đó
			setTimeout(function()
			{
				//check order id có tồn tại trong các lệnh mua bán trước đó không
				if(orderId in extOrders)
				{
					var thisOrder = extOrders[orderId];
					
					var param = {
						execInst : 'Close,LastPrice',
						ordType  : 'StopLimit',
						symbol   : 'XBTUSD',
						orderQty : thisOrder.qty,
						price    : thisOrder.price,
						side     : thisOrder.side,
						stopPx   : thisOrder.stopPx,
						
					};
					
					//Xóa order id khỏi hàng chờ
					delete extOrders[orderId];
					//Chạy hàm thực hiện lệnh stop limit
					createOrder(param, false);	
				}
				
			},1000);
			
		}
	}
 
}


//Khi click vào "BUY" hoặc "SELL"
$(document).on('click','.extBuy',function(e)
{

	var side = $(this).attr('data-side');

	var extQty   = parseInt($('.extQty').val());
	var extPrice = parseFloat($('.extPrice').val());
	
	extStoploss  = parseInt($('.extStoploss').val());
	extStoplimit = parseInt($('.extStoplimit').val());
	console.log(extStoploss);
	
	//Kiểm tra form nhập vào
	if( ! extQty || extQty < 1){
		alert('Vui lòng nhập số lượng');
		return false;	
	}
	if( ! extStoploss || extStoploss < 1){
		alert('Vui lòng nhập Stop Loss');
		return false;	
	}
	if( ! extStoplimit ){
		extStoplimit = 0;
	}
	
	//Thiết lập data order gửi đi
	var param = {
		ordType  : 'Market',
		orderQty : extQty,
		side     : side,
		symbol   : 'XBTUSD'
	};
	
	//Nếu không mua với giá Market
	if($('.extPriceMarket').is(':checked') === false)
	{
		if( ! extPrice || extPrice < 1){
			alert('Vui lòng nhập Entry Price');
			return false;	
		}
		
		param['ordType']  = 'Limit';
		param['price']    = extPrice;
	}
	//Ẩn nút Buy/Sell cho đến khi lệnh được thực hiện thành công
	$(this).prop('disabled',true);
	//chạy hàm thực hiện lệnh mua vào hoặc bán trước
	createOrder(param,true);	
	
});

//Hàm thực hiện lệnh tạo order mới(Buy/Sell)
function createOrder(param,create)
{
	$.ajax({
		url:'https://'+baseUrl+'/api/v1/order',
		type:'POST',
		contentType:"application/json",
		data:JSON.stringify(param),
		dataType:"json",
		success:function(res)
		{
			if(create === true)
			{
				
				var side, execPrice, limitPrice, stopPrice;
				
				//Nếu order type là Market thì giá thực thi bằng giá thị trường, Ngược lại giá thực thi bằng giá đặt mua			
				if(param.ordType == 'Market')
					execPrice = res.price;
				else
					execPrice = param.price
				
				//Nếu là Buy / Long thì sẽ bán và ngược lại	
				if(param.side == 'Buy')
				{
					side = 'Sell';
					limitPrice  = execPrice - extStoploss;
					stopPrice   = limitPrice + extStoplimit;
				}
				else
				{
					side = 'Buy';
					limitPrice  = execPrice + extStoploss;
					stopPrice   = limitPrice - extStoplimit;	
				}
				
				//Thêm order vào danh sách hàng chờ
				extOrders[res.orderID] = {
					'id'    : res.orderID,
					'qty'   : param.orderQty,
					'price' : limitPrice,
					'stopPx': stopPrice,
					'side'  : side,
				};
				//show thông tin info hiện tại ra màn hình
				var extInfo ='<p>Type: '   + param.side +'</p>'
							 +'<p>Order Qty: '   + param.orderQty +'</p>'
							 +'<p>Order Price: ' + res.price +'</p>'
							 +'<p>Exec Price: '  + execPrice +'</p>'
							 +'<p>Limit Price: ' + limitPrice +'</p>'
						     +'<p>Stop Price:'   + stopPrice +'</p>';	
				$('.extInfo').html(extInfo);
				
				$('.extBuy:disabled').prop('disabled',false);
				
			}
			
		}
	});
}


//Hàm chèn dashboard tool
function extNav()
{
	var html = ''
		+'<div class="extNav">'
			+'<div class="extCol">'
				+'<div>'
					+'<div class="extTitle"><label>Quantity</label></div>'
					+'<div class="extInput">'
						+'<input class="form-control extQty" type="number" />'
					+'</div>'
				+'</div>'
				
				+'<div>'
					+'<div class="extTitle">'
						+'<label>Entry price</label>'
						+'<div class="extCheck extCheckMarket"><input class="extPriceMarket" min="1" type="checkbox"  value="1"><b>Market</b></div>'
					+'</div>'
					+'<div class="extInput">'
						+'<input class="form-control extPrice" type="number" min="1" />'
					+'</div>'
				+'</div>'
				+'<div>'
					+'<div class="extTitle"><label>Stop loss</label></div>'
					+'<input class="form-control extStoploss" type="number"  min="1" />'
				+'</div>'
			+'</div>'
			+'<div class="extCol">'
				+'<div>'
					+'<div class="extTitle"><label>Stop Limit</label></div>'
					+'<div>'
						+'<input class="form-control extStoplimit" placeholder="Stop limit value" type="number"  min="1" />'
					+'</div>'
				
				+'</div>'
			+'</div>'
			
			+'<div class="extCol">'
				+'<div>'
					+'<button class="extBuy btn btn-success" data-side="Buy">Buy / Long</button>'
				+'</div>'
				+'<div>'
					+'<button class="extBuy btn btn-danger" data-side="Sell">Sell / Short</button>'
				+'</div>'
			+'</div>'
			+'<div class="extCol extInfo">'
				
			+'</div>'
			
		+'</div>'
		+'';	
	$('body').append(html);
}
//Hàm check cookie
function getCookie(cname){
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

//Hàm Debug
function debug(message)
{
	var debugContent = '<p>'+message+'</p>';
	$(debugContent).insertBefore('.extDebug p:last');
}

//Các hàm liên quan đến giao diện
$(document).on('change','.extPriceMarket',function(e)
{
	if($(this).is(':checked')){
		$('.extPrice').prop('disabled',true);	
	} 
	else{
		$('.extPrice').prop('disabled',false);	
	}
});

$(document).on('click','.extCheck',function(e){
	$(this).find('input').click();	
});
