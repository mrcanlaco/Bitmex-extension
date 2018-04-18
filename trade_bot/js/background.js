
//Background lắng nghe nếu có tin nhắn sẽ mở cookie bitmex

chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {
	
	if(request.mes == "fix cookie")
	{
		chrome.cookies.getAll({"domain": 'testnet.bitmex.com'}, function(cookie){
			for(i=0;i<cookie.length;i++)
			{
				chrome.cookies.remove({url:'https://testnet.bitmex.com',name:cookie[i].name})
				chrome.cookies.set({
					url:'https://testnet.bitmex.com',
					domain:'testnet.bitmex.com',
					name:cookie[i].name,
					value: cookie[i].value,
					httpOnly:false,
				});
			}
		});	
	}
});