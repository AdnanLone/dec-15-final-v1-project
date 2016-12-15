
$( "#target" ).click(function() {


$.get('http://172.23.50.94:3000/test',function(data){
	console.log('file');


$listSelector = $('#list');

var realArray =$.makeArray(data);
console.log(realArray);

// $.each(realArray,function(i,val){
// 	console.log(val);
	
// 	$listSelector.append('<li>'+ val + '</li>')

// })

$.each(data,function(key,value){
	console.log(key + value);
$listSelector.append('<li>'+ value + '</li>')
})



})

});