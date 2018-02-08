var shoppingList = angular.module('ShoppingList', []);



function mainController($scope, $http) {
	$scope.formData = {};

	$scope.getItems = function () {
		$http.get('/api/items/'+listId)
				.success(function(data) {
					$scope.items = data.items;
					console.log(data);
				})
				.error(function(data) {
					console.log('Error: ' + data);
				});
	};

	// when landing on the page, get all items and show them
	$scope.getItems();

	// when submitting the add form, send the text to the node API
	$scope.createTodo = function() {
		if ($scope.formData != null){
			$scope.formData.list = listId;
			$http.post('/api/items', $scope.formData)
				.success(function(data) {
					$scope.formData = {}; // clear the form so our user is ready to enter another
					$scope.getItems();
				})
				.error(function(data) {
					console.log('Error: ' + data);
				});
		}
		else {
			$scope.formData = {};
		}
	};

	// delete an item after checking it
	$scope.deleteTodo = function(id) {
		$http.delete('/api/items/' + id)
			.success(function(data) {
				$scope.getItems();
			})
			.error(function(data) {
				console.log('Error: ' + data);
			});
	};

}