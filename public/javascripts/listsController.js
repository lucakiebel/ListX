var shoppingList = angular.module('ShoppingList', []);

function mainController($scope, $http) {
	$scope.formData = {};

	// when landing on the page, get all todos and show them
	$http.get('/api/items/'+listId)
		.success(function(data) {
			$scope.items = data.items;
			console.log(data);
		})
		.error(function(data) {
			console.log('Error: ' + data);
		});

	// when submitting the add form, send the text to the node API
	$scope.createTodo = function() {
		if ($scope.formData != null){
			$scope.formData.list = listId;
			$http.post('/api/items', $scope.formData)
				.success(function(data) {
					$scope.formData = {}; // clear the form so our user is ready to enter another
					$http.get('/api/items/'+listId)
						.success(function(data) {
							$scope.items = data.items;
							console.log(data);
						})
						.error(function(data) {
							console.log('Error: ' + data);
						});
				})
				.error(function(data) {
					console.log('Error: ' + data);
				});
		}
		else {
			$scope.formData = {};
		}
	};

	// delete a todo after checking it
	$scope.deleteTodo = function(id) {
		$http.delete('/api/items/' + id)
			.success(function(data) {
				$http.get('/api/items/' + listId)
					.success(function(data) {
						$scope.items = data.items;
						console.log(data);
					})
					.error(function(data) {
						console.log('Error: ' + data);
					});
			})
			.error(function(data) {
				console.log('Error: ' + data);
			});
	};

}